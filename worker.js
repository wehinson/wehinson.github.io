const SESSION_PREFIX = "session:";
const FEEDBACK_PREFIX = "feedback:";
const PASSCODE_PATTERN = /^\d{6}$/;
const BODY_SIZE_LIMIT = 512 * 1024; // 512 KB — generous for real use, blocks abuse
const FEEDBACK_SIZE_LIMIT = 64 * 1024; // 64 KB per feedback entry

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/sessions")) {
      return handleSessionRequest(request, env);
    }

    if (url.pathname === "/api/feedback") {
      return handleFeedbackRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleFeedbackRequest(request, env) {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 204);
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const store = getSessionStore(env);
  if (!store) {
    return jsonResponse({ error: "Cloudflare KV binding is missing." }, 500);
  }

  let rawText;
  try {
    rawText = await request.text();
  } catch {
    return jsonResponse({ error: "Send feedback as JSON." }, 400);
  }

  if (rawText.length > FEEDBACK_SIZE_LIMIT) {
    return jsonResponse({ error: "Feedback exceeds the 64 KB limit." }, 413);
  }

  let body;
  try {
    body = JSON.parse(rawText);
  } catch {
    return jsonResponse({ error: "Send feedback as JSON." }, 400);
  }

  const message = String(body?.message || "").trim();
  if (!message) {
    return jsonResponse({ error: "Feedback message is required." }, 400);
  }

  const entry = {
    message: message.slice(0, 4000),
    snapshot: body.snapshot || null,
    receivedAt: new Date().toISOString()
  };

  const key = `${FEEDBACK_PREFIX}${entry.receivedAt}:${Math.random().toString(36).slice(2, 8)}`;
  await store.put(key, JSON.stringify(entry));
  return jsonResponse({ ok: true, key }, 201);
}

async function handleSessionRequest(request, env) {
  const sessions = getSessionStore(env);

  if (request.method === "OPTIONS") {
    return jsonResponse({}, 204);
  }

  if (!sessions) {
    return jsonResponse({ error: "Cloudflare KV binding is missing. Add a KV binding named KV_BINDING, SESSIONS, or KV." }, 500);
  }

  const url = new URL(request.url);
  const passcode = url.pathname.split("/").filter(Boolean).at(-1);

  if (request.method === "POST") {
    return createSession(request, sessions);
  }

  if (!PASSCODE_PATTERN.test(passcode || "")) {
    return jsonResponse({ error: "Use a six-digit passcode." }, 400);
  }

  if (request.method === "GET") {
    return getSession(sessions, passcode);
  }

  if (request.method === "PUT") {
    return saveSession(request, sessions, passcode);
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
}

function getSessionStore(env) {
  return env.KV_BINDING || env.SESSIONS || env.KV || null;
}

async function createSession(request, sessions) {
  const session = await readSessionBody(request);

  if (!session.ok) {
    return jsonResponse({ error: session.error }, 400);
  }

  const passcode = session.value.passcode;
  const key = sessionKey(passcode);
  const existing = await sessions.get(key);

  if (existing) {
    return jsonResponse({ error: "That passcode already exists." }, 409);
  }

  await sessions.put(key, JSON.stringify(session.value));
  return jsonResponse({ session: session.value }, 201);
}

async function getSession(sessions, passcode) {
  const saved = await sessions.get(sessionKey(passcode));

  if (!saved) {
    return jsonResponse({ error: "No online ranking found for that passcode." }, 404);
  }

  try {
    return jsonResponse({ session: JSON.parse(saved) });
  } catch {
    return jsonResponse({ error: "Saved ranking is corrupted." }, 500);
  }
}

async function saveSession(request, sessions, passcode) {
  const session = await readSessionBody(request);

  if (!session.ok) {
    return jsonResponse({ error: session.error }, 400);
  }

  if (session.value.passcode !== passcode) {
    return jsonResponse({ error: "Passcode in the URL and saved data must match." }, 400);
  }

  await sessions.put(sessionKey(passcode), JSON.stringify(session.value));
  return jsonResponse({ session: session.value });
}

async function readSessionBody(request) {
  let rawText;

  try {
    rawText = await request.text();
  } catch {
    return { ok: false, error: "Send session data as JSON." };
  }

  if (rawText.length > BODY_SIZE_LIMIT) {
    return { ok: false, error: "Session data exceeds the 512 KB size limit." };
  }

  let session;

  try {
    session = JSON.parse(rawText);
  } catch {
    return { ok: false, error: "Send session data as JSON." };
  }

  const passcode = normalizePasscode(session?.passcode);

  if (!PASSCODE_PATTERN.test(passcode)) {
    return { ok: false, error: "Session needs a six-digit passcode." };
  }

  if (!["solo", "partner"].includes(session.mode)) {
    return { ok: false, error: "Session mode must be solo or partner." };
  }

  session.passcode = passcode;
  session.updatedAt = new Date().toISOString();

  return { ok: true, value: session };
}

function normalizePasscode(passcode) {
  return String(passcode || "").replace(/\D/g, "").slice(0, 6);
}

function sessionKey(passcode) {
  return `${SESSION_PREFIX}${passcode}`;
}

function jsonResponse(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
