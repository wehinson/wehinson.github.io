const SESSION_PREFIX = "session:";
const PASSCODE_PATTERN = /^\d{6}$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return jsonResponse({}, 204);
  }

  if (!env.SESSIONS) {
    return jsonResponse({ error: "Cloudflare KV binding SESSIONS is missing." }, 500);
  }

  const url = new URL(request.url);
  const passcode = url.pathname.split("/").filter(Boolean).at(-1);

  if (request.method === "POST") {
    return createSession(request, env);
  }

  if (!PASSCODE_PATTERN.test(passcode || "")) {
    return jsonResponse({ error: "Use a six-digit passcode." }, 400);
  }

  if (request.method === "GET") {
    return getSession(env, passcode);
  }

  if (request.method === "PUT") {
    return saveSession(request, env, passcode);
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
}

async function createSession(request, env) {
  const session = await readSessionBody(request);

  if (!session.ok) {
    return jsonResponse({ error: session.error }, 400);
  }

  const passcode = session.value.passcode;
  const key = sessionKey(passcode);
  const existing = await env.SESSIONS.get(key);

  if (existing) {
    return jsonResponse({ error: "That passcode already exists." }, 409);
  }

  await env.SESSIONS.put(key, JSON.stringify(session.value));
  return jsonResponse({ session: session.value }, 201);
}

async function getSession(env, passcode) {
  const saved = await env.SESSIONS.get(sessionKey(passcode));

  if (!saved) {
    return jsonResponse({ error: "No online ranking found for that passcode." }, 404);
  }

  try {
    return jsonResponse({ session: JSON.parse(saved) });
  } catch {
    return jsonResponse({ error: "Saved ranking is corrupted." }, 500);
  }
}

async function saveSession(request, env, passcode) {
  const session = await readSessionBody(request);

  if (!session.ok) {
    return jsonResponse({ error: session.error }, 400);
  }

  if (session.value.passcode !== passcode) {
    return jsonResponse({ error: "Passcode in the URL and saved data must match." }, 400);
  }

  await env.SESSIONS.put(sessionKey(passcode), JSON.stringify(session.value));
  return jsonResponse({ session: session.value });
}

async function readSessionBody(request) {
  let session;

  try {
    session = await request.json();
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
