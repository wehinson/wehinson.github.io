const STARTING_ELO = 1000;
const WIN_K = 32;
const HARD_TO_CHOOSE_BOOST = 4;
const MAX_PHOTOS = 20;
const PREVIEW_PHOTOS = 4;
const RANKING_PREVIEW_COUNT = 15;
const APP_VERSION = "v0.9.0";
const SESSION_PREFIX = "country-ranker-session-";
const SESSION_BACKUP_PREFIX = "country-ranker-session-backup-";
const SESSION_INDEX_KEY = "country-ranker-session-index";
const LAST_PASSCODE_KEY = "country-ranker-last-passcode";

const baseCountries = normalizeCountries(window.COUNTRY_DATA || []);
const countryById = new Map(baseCountries.map((country) => [country.id, country]));

let session = null;
let countries = [];
let currentPair = [];
let rankingView = "active";
let rankingsExpanded = false;
let lovedView = "me";
let storageWarning = "";

const els = {
  onboarding: document.querySelector("#onboarding"),
  welcomePanel: document.querySelector("#welcomePanel"),
  appVersionLabel: document.querySelector("#appVersionLabel"),
  existingPanel: document.querySelector("#existingPanel"),
  newPanel: document.querySelector("#newPanel"),
  profilePanel: document.querySelector("#profilePanel"),
  openHelp: document.querySelector("#openHelp"),
  helpModal: document.querySelector("#helpModal"),
  closeHelp: document.querySelector("#closeHelp"),
  floatingTooltip: document.querySelector("#floatingTooltip"),
  showExistingSession: document.querySelector("#showExistingSession"),
  showNewSession: document.querySelector("#showNewSession"),
  passcodeInput: document.querySelector("#passcodeInput"),
  loadSession: document.querySelector("#loadSession"),
  existingMessage: document.querySelector("#existingMessage"),
  backToWelcomeFromExisting: document.querySelector("#backToWelcomeFromExisting"),
  backToWelcomeFromNew: document.querySelector("#backToWelcomeFromNew"),
  newPasscode: document.querySelector("#newPasscode"),
  meNameInput: document.querySelector("#meNameInput"),
  partnerNameInput: document.querySelector("#partnerNameInput"),
  startSolo: document.querySelector("#startSolo"),
  startPartner: document.querySelector("#startPartner"),
  chooseMe: document.querySelector("#chooseMe"),
  choosePartner: document.querySelector("#choosePartner"),
  sessionPasscode: document.querySelector("#sessionPasscode"),
  activeProfileLabel: document.querySelector("#activeProfileLabel"),
  sessionModeLabel: document.querySelector("#sessionModeLabel"),
  storageWarning: document.querySelector("#storageWarning"),
  switchProfile: document.querySelector("#switchProfile"),
  changeSession: document.querySelector("#changeSession"),
  countryCount: document.querySelector("#countryCount"),
  roundCount: document.querySelector("#roundCount"),
  leftPhotos: document.querySelector("#leftPhotos"),
  leftName: document.querySelector("#leftName"),
  leftSummary: document.querySelector("#leftSummary"),
  leftRating: document.querySelector("#leftRating"),
  leftLove: document.querySelector("#leftLove"),
  leftSuggestRemoval: document.querySelector("#leftSuggestRemoval"),
  leftComment: document.querySelector("#leftComment"),
  leftSaveComment: document.querySelector("#leftSaveComment"),
  leftMorePhotos: document.querySelector("#leftMorePhotos"),
  rightPhotos: document.querySelector("#rightPhotos"),
  rightName: document.querySelector("#rightName"),
  rightSummary: document.querySelector("#rightSummary"),
  rightRating: document.querySelector("#rightRating"),
  rightLove: document.querySelector("#rightLove"),
  rightSuggestRemoval: document.querySelector("#rightSuggestRemoval"),
  rightComment: document.querySelector("#rightComment"),
  rightSaveComment: document.querySelector("#rightSaveComment"),
  rightMorePhotos: document.querySelector("#rightMorePhotos"),
  leftChoose: document.querySelector("#leftChoose"),
  rightChoose: document.querySelector("#rightChoose"),
  hardChoice: document.querySelector("#hardChoice"),
  skipPair: document.querySelector("#skipPair"),
  resetRatings: document.querySelector("#resetRatings"),
  lastAction: document.querySelector("#lastAction"),
  rankingControls: document.querySelector("#rankingControls"),
  viewTogether: document.querySelector("#viewTogether"),
  viewMe: document.querySelector("#viewMe"),
  viewPartner: document.querySelector("#viewPartner"),
  rankingList: document.querySelector("#rankingList"),
  toggleRankings: document.querySelector("#toggleRankings"),
  lovedControls: document.querySelector("#lovedControls"),
  lovedMe: document.querySelector("#lovedMe"),
  lovedPartner: document.querySelector("#lovedPartner"),
  lovedList: document.querySelector("#lovedList"),
  removedList: document.querySelector("#removedList"),
  commentsFeed: document.querySelector("#commentsFeed"),
  donationFooter: document.querySelector(".donation-footer"),
  hideDonation: document.querySelector("#hideDonation"),
  photoModal: document.querySelector("#photoModal"),
  modalTitle: document.querySelector("#modalTitle"),
  modalPhotos: document.querySelector("#modalPhotos"),
  closeModal: document.querySelector("#closeModal")
};

function normalizeCountries(input) {
  if (!Array.isArray(input)) {
    throw new Error("Use a JSON array of countries.");
  }

  const normalized = input.map((country, index) => {
    const name = String(country.name || "").trim();
    const summary = String(country.summary || "").trim();
    const photos = normalizePhotos(country);

    if (!name || !summary || photos.length === 0) {
      throw new Error(`Country ${index + 1} needs name, summary, and at least one photo.`);
    }

    return {
      id: String(country.id || slugify(name)).trim(),
      name,
      summary,
      photos
    };
  });

  if (normalized.length < 2) {
    throw new Error("Add at least two countries to compare.");
  }

  return normalized;
}

function normalizePhotos(country) {
  const spreadsheetPhotos = [];

  for (let index = 1; index <= MAX_PHOTOS; index += 1) {
    spreadsheetPhotos.push(country[`photo${index}`]);
  }

  const photoList = Array.isArray(country.photos)
    ? country.photos
    : [country.photo || country.photoUrl, ...spreadsheetPhotos];

  return photoList.map((photo) => String(photo || "").trim()).filter(Boolean).slice(0, MAX_PHOTOS);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getActiveProfile() {
  return session.profiles[session.activeProfile];
}

function getProfileName(profileName) {
  return session.profileNames?.[profileName] || (profileName === "partner" ? "Partner" : "Me");
}

function cleanName(value, fallback) {
  return String(value || "").trim() || fallback;
}

function makeProfile() {
  return {
    ratings: Object.fromEntries(baseCountries.map((country) => [country.id, STARTING_ELO])),
    rounds: 0,
    currentPair: null,
    loved: [],
    comments: {},
    donationHidden: false
  };
}

function makeSession(passcode, mode, profileNames) {
  return {
    passcode: normalizePasscode(passcode),
    mode,
    activeProfile: "me",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profileNames: {
      me: cleanName(profileNames?.me, "Me"),
      partner: cleanName(profileNames?.partner, "Partner")
    },
    removedCountryIds: [],
    removalSuggestions: {},
    profiles: {
      me: makeProfile(),
      partner: makeProfile()
    }
  };
}

function storageKey(passcode) {
  return `${SESSION_PREFIX}${normalizePasscode(passcode)}`;
}

function backupStorageKey(passcode) {
  return `${SESSION_BACKUP_PREFIX}${normalizePasscode(passcode)}`;
}

function normalizePasscode(passcode) {
  return String(passcode || "").replace(/\D/g, "").slice(0, 6);
}

function isValidPasscode(passcode) {
  return normalizePasscode(passcode).length === 6;
}

function generatePasscode() {
  const passcode = String(Math.floor(100000 + Math.random() * 900000));

  if (readStoredSessionPayload(passcode)) {
    return generatePasscode();
  }

  return passcode;
}

function saveSession() {
  if (!session) {
    return false;
  }

  session.updatedAt = new Date().toISOString();
  const passcode = normalizePasscode(session.passcode);
  const payload = JSON.stringify(session);

  try {
    localStorage.setItem(storageKey(passcode), payload);
    localStorage.setItem(backupStorageKey(passcode), payload);
    localStorage.setItem(LAST_PASSCODE_KEY, passcode);
    writeSessionIndex(passcode);

    if (localStorage.getItem(storageKey(passcode)) !== payload) {
      throw new Error("Storage verification failed");
    }

    storageWarning = "";
    return true;
  } catch {
    storageWarning = "Your browser is not keeping local saves right now. Keep this tab open, or try a normal browser window.";
    return false;
  }
}

function loadSessionByPasscode(passcode) {
  const normalizedPasscode = normalizePasscode(passcode);

  if (!isValidPasscode(normalizedPasscode)) {
    return { error: "Enter a six-digit passcode." };
  }

  const saved = readStoredSessionPayload(normalizedPasscode);

  if (!saved) {
    return { error: "No saved ranking found for that passcode on this computer." };
  }

  try {
    return { session: hydrateSession(JSON.parse(saved)) };
  } catch {
    return { error: "That saved ranking could not be loaded." };
  }
}

function readStoredSessionPayload(passcode) {
  const normalizedPasscode = normalizePasscode(passcode);

  try {
    return localStorage.getItem(storageKey(normalizedPasscode))
      || localStorage.getItem(backupStorageKey(normalizedPasscode))
      || readSessionFromIndex(normalizedPasscode);
  } catch {
    return null;
  }
}

function readSessionFromIndex(passcode) {
  const index = readSessionIndex();
  const entry = index[normalizePasscode(passcode)];

  return entry?.payload || null;
}

function readSessionIndex() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_INDEX_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeSessionIndex(passcode) {
  const normalizedPasscode = normalizePasscode(passcode);
  const index = readSessionIndex();

  index[normalizedPasscode] = {
    passcode: normalizedPasscode,
    mode: session.mode,
    profileNames: session.profileNames,
    updatedAt: session.updatedAt,
    payload: JSON.stringify(session)
  };

  localStorage.setItem(SESSION_INDEX_KEY, JSON.stringify(index));
}

function hydrateSession(savedSession) {
  const mode = savedSession.mode === "partner" ? "partner" : "solo";
  const restored = makeSession(savedSession.passcode, mode, savedSession.profileNames);
  restored.activeProfile = savedSession.activeProfile === "partner" ? "partner" : "me";
  restored.createdAt = savedSession.createdAt || restored.createdAt;
  restored.updatedAt = savedSession.updatedAt || restored.updatedAt;
  restored.removedCountryIds = normalizeCountryIdList(savedSession.removedCountryIds);
  restored.removalSuggestions = normalizeRemovalSuggestions(savedSession.removalSuggestions);

  ["me", "partner"].forEach((profileName) => {
    const savedProfile = savedSession.profiles?.[profileName] || {};
    const restoredProfile = restored.profiles[profileName];
    restoredProfile.rounds = Number.isFinite(savedProfile.rounds) ? savedProfile.rounds : 0;
    restoredProfile.currentPair = normalizePair(savedProfile.currentPair);
    restoredProfile.loved = normalizeCountryIdList(savedProfile.loved);
    restoredProfile.comments = normalizeComments(savedProfile.comments);
    restoredProfile.donationHidden = Boolean(savedProfile.donationHidden);

    Object.entries(savedProfile.ratings || {}).forEach(([id, rating]) => {
      if (countryById.has(id) && Number.isFinite(rating)) {
        restoredProfile.ratings[id] = rating;
      }
    });
  });

  if (mode === "solo") {
    restored.activeProfile = "me";
  }

  return restored;
}

function normalizeCountryIdList(ids) {
  return Array.isArray(ids) ? [...new Set(ids.filter((id) => countryById.has(id)))] : [];
}

function normalizeRemovalSuggestions(suggestions) {
  const normalized = {};

  Object.entries(suggestions || {}).forEach(([id, suggestedBy]) => {
    if (countryById.has(id) && ["me", "partner"].includes(suggestedBy)) {
      normalized[id] = suggestedBy;
    }
  });

  return normalized;
}

function normalizeComments(comments) {
  const normalized = {};

  Object.entries(comments || {}).forEach(([id, comment]) => {
    if (!countryById.has(id)) {
      return;
    }

    if (typeof comment === "string") {
      const text = comment.trim();

      if (text) {
        normalized[id] = {
          text,
          updatedAt: new Date().toISOString()
        };
      }
      return;
    }

    const text = String(comment?.text || "").trim();

    if (text) {
      normalized[id] = {
        text,
        updatedAt: comment?.updatedAt || new Date().toISOString()
      };
    }
  });

  return normalized;
}

function normalizePair(pair) {
  if (!Array.isArray(pair) || pair.length !== 2) {
    return null;
  }

  const ids = pair.map((id) => String(id || ""));
  return ids.every((id) => countryById.has(id)) && ids[0] !== ids[1] ? ids : null;
}

function beginSession(nextSession, profile = "me") {
  session = nextSession;
  session.activeProfile = session.mode === "partner" ? profile : "me";
  rankingView = session.mode === "partner" ? "together" : "active";
  rankingsExpanded = false;
  lovedView = session.activeProfile;

  if (!getActiveProfile().currentPair) {
    getActiveProfile().currentPair = pickPairIds();
  }

  saveSession();
  renderApp("Ready");
  els.onboarding.hidden = true;
}

function showPanel(panel) {
  [els.welcomePanel, els.existingPanel, els.newPanel, els.profilePanel].forEach((item) => {
    item.hidden = item !== panel;
  });
}

function buildCountriesForActiveProfile() {
  const ratings = getActiveProfile().ratings;

  return activeBaseCountries().map((country) => ({
    ...country,
    rating: Number.isFinite(ratings[country.id]) ? ratings[country.id] : STARTING_ELO
  }));
}

function syncActiveRatings() {
  const ratings = getActiveProfile().ratings;

  countries.forEach((country) => {
    ratings[country.id] = country.rating;
  });
}

function expectedScore(a, b) {
  return 1 / (1 + 10 ** ((b.rating - a.rating) / 400));
}

function applyWin(winner, loser) {
  const winnerExpected = expectedScore(winner, loser);
  const loserExpected = expectedScore(loser, winner);

  winner.rating = Math.round(winner.rating + WIN_K * (1 - winnerExpected));
  loser.rating = Math.round(loser.rating + WIN_K * (0 - loserExpected));
}

function applyHardChoice(a, b) {
  a.rating += HARD_TO_CHOOSE_BOOST;
  b.rating += HARD_TO_CHOOSE_BOOST;
}

function pickPairIds() {
  const pool = activeBaseCountries();

  if (pool.length < 2) {
    return null;
  }

  const firstIndex = Math.floor(Math.random() * pool.length);
  let secondIndex = Math.floor(Math.random() * pool.length);

  while (secondIndex === firstIndex) {
    secondIndex = Math.floor(Math.random() * pool.length);
  }

  return [pool[firstIndex].id, pool[secondIndex].id];
}

function setCurrentPairFromProfile() {
  const profile = getActiveProfile();

  if (!normalizePair(profile.currentPair)) {
    profile.currentPair = pickPairIds();
  }

  if (!profile.currentPair) {
    currentPair = [];
    return;
  }

  currentPair = profile.currentPair.map((id) => countries.find((country) => country.id === id));

  if (currentPair.some((country) => !country) || currentPair.some((country) => isRemoved(country.id))) {
    profile.currentPair = pickPairIds();
    currentPair = profile.currentPair ? profile.currentPair.map((id) => countries.find((country) => country.id === id)) : [];
  }
}

function advance(message, shouldCountRound = true) {
  const profile = getActiveProfile();

  if (shouldCountRound) {
    profile.rounds += 1;
  }

  syncActiveRatings();
  profile.currentPair = pickPairIds();
  saveSession();
  renderApp(message);
}

function renderApp(message = els.lastAction.textContent || "Ready") {
  countries = buildCountriesForActiveProfile();
  setCurrentPairFromProfile();
  renderPair();
  renderRankings();
  renderLovedList();
  renderRemovedList();
  renderCommentsFeed();
  renderDonationFooter();
  renderSession(message);
}

function renderSession(message) {
  const activeLabel = getProfileName(session.activeProfile);
  const otherProfile = session.activeProfile === "me" ? "partner" : "me";
  const modeLabel = session.mode === "partner" ? "Partner ranking" : `${getProfileName("me")}'s ranking`;
  els.sessionPasscode.textContent = `Passcode ${session.passcode}`;
  els.activeProfileLabel.textContent = session.mode === "partner" ? activeLabel : getProfileName("me");
  els.sessionModeLabel.textContent = modeLabel;
  els.switchProfile.hidden = session.mode !== "partner";
  els.switchProfile.textContent = `Switch to ${getProfileName(otherProfile)}`;
  els.lastAction.textContent = message;
  els.storageWarning.hidden = !storageWarning;
  els.storageWarning.textContent = storageWarning;
}

function renderPair() {
  const [left, right] = currentPair;
  const hasPair = Boolean(left && right);

  [els.leftChoose, els.rightChoose, els.hardChoice, els.skipPair].forEach((button) => {
    button.disabled = !hasPair;
  });

  if (!hasPair) {
    return;
  }

  renderCountry("left", left);
  renderCountry("right", right);
}

function renderCountry(side, country) {
  const previewPhotos = getPreviewPhotos(country.photos);
  const moreButton = els[`${side}MorePhotos`];
  const nameLink = els[`${side}Name`];
  const loveButton = els[`${side}Love`];
  const removalButton = els[`${side}SuggestRemoval`];
  const commentInput = els[`${side}Comment`];
  const saveCommentButton = els[`${side}SaveComment`];

  els[`${side}Photos`].innerHTML = previewPhotos.map((photo, index) => (
    `<img src="${escapeHtml(photo)}" alt="${escapeHtml(country.name)} photo ${index + 1}">`
  )).join("");
  nameLink.textContent = country.name;
  nameLink.href = wikipediaUrl(country.name);
  els[`${side}Summary`].textContent = country.summary;
  els[`${side}Rating`].textContent = `ELO ${country.rating}`;
  renderCountryActionButtons(country, loveButton, removalButton);
  renderCommentBox(country, commentInput, saveCommentButton);
  moreButton.hidden = country.photos.length <= PREVIEW_PHOTOS;
  moreButton.textContent = `More photos (${country.photos.length})`;
  moreButton.onclick = () => openPhotoModal(country);
}

function renderCountryActionButtons(country, loveButton, removalButton) {
  const loved = getActiveProfile().loved.includes(country.id);
  const suggestedBy = session.removalSuggestions[country.id];

  loveButton.classList.toggle("active", loved);
  loveButton.textContent = loved ? "♥" : "♡";
  loveButton.setAttribute("aria-label", loved ? `Unlove ${country.name}` : `Love ${country.name}`);
  loveButton.dataset.tooltip = loved
    ? "Remove this country from your personal loved list."
    : "Save this country to your personal loved list without changing its ranking.";
  loveButton.onclick = () => toggleLove(country.id);

  if (session.mode === "solo") {
    removalButton.textContent = "Remove from queue";
    removalButton.dataset.tooltip = "Remove this country from your future matchups.";
  } else if (suggestedBy && suggestedBy !== session.activeProfile) {
    removalButton.textContent = `Agree remove`;
    removalButton.dataset.tooltip = `${getProfileName(suggestedBy)} suggested removing this country. Agree to remove it from future matchups for both of you.`;
  } else if (suggestedBy === session.activeProfile) {
    removalButton.textContent = "Removal suggested";
    removalButton.dataset.tooltip = "Your removal suggestion is saved. The other person can agree when they see this country.";
  } else {
    removalButton.textContent = "Suggest removal";
    removalButton.dataset.tooltip = "Ask the other person to remove this country from future matchups. It only disappears if they agree.";
  }

  removalButton.onclick = () => handleRemoval(country.id);
}

function renderCommentBox(country, commentInput, saveCommentButton) {
  const comment = getActiveProfile().comments[country.id];

  commentInput.value = comment?.text || "";
  saveCommentButton.onclick = () => saveComment(country.id, commentInput.value);
}

function getPreviewPhotos(photos) {
  const previewPhotos = photos.slice(0, PREVIEW_PHOTOS);

  while (previewPhotos.length < PREVIEW_PHOTOS) {
    previewPhotos.push(previewPhotos[0]);
  }

  return previewPhotos;
}

function openPhotoModal(country) {
  els.modalTitle.textContent = `${country.name} photos`;
  els.modalPhotos.innerHTML = country.photos.map((photo, index) => (
    `<img src="${escapeHtml(photo)}" alt="${escapeHtml(country.name)} photo ${index + 1}">`
  )).join("");
  els.photoModal.showModal();
}

function renderRankings() {
  const sorted = getRankingRows();
  const visibleRows = rankingsExpanded ? sorted : sorted.slice(0, RANKING_PREVIEW_COUNT);

  els.rankingList.innerHTML = visibleRows.map((country) => (
    `<li><a href="${wikipediaUrl(country.name)}" target="_blank" rel="noopener"><strong>${escapeHtml(country.name)}</strong></a><span>${escapeHtml(country.meta)}</span></li>`
  )).join("");

  renderRankingControls();
  els.countryCount.textContent = `${countries.length} ${countries.length === 1 ? "country" : "countries"}`;
  els.roundCount.textContent = `${getActiveProfile().rounds} ${getActiveProfile().rounds === 1 ? "round" : "rounds"}`;
  els.toggleRankings.hidden = sorted.length <= RANKING_PREVIEW_COUNT;
  els.toggleRankings.textContent = rankingsExpanded ? "Show top 15" : `See more (${sorted.length - RANKING_PREVIEW_COUNT} more)`;
}

function getRankingRows() {
  if (session.mode === "partner" && rankingView === "together") {
    return getTogetherRankings();
  }

  const profileName = rankingView === "partner" ? "partner" : rankingView === "me" ? "me" : session.activeProfile;
  const ratings = session.profiles[profileName].ratings;

  return activeBaseCountries()
    .map((country) => ({
      ...country,
      rating: Number.isFinite(ratings[country.id]) ? ratings[country.id] : STARTING_ELO
    }))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
    .map((country) => ({
      ...country,
      meta: `ELO ${country.rating}`
    }));
}

function getTogetherRankings() {
  const profileRankings = ["me", "partner"].map((profileName) => {
    const ratings = session.profiles[profileName].ratings;

    return activeBaseCountries()
      .map((country) => ({
        id: country.id,
        rating: Number.isFinite(ratings[country.id]) ? ratings[country.id] : STARTING_ELO
      }))
      .sort((a, b) => b.rating - a.rating || countryById.get(a.id).name.localeCompare(countryById.get(b.id).name))
      .reduce((rankings, country, index) => {
        rankings[country.id] = index + 1;
        return rankings;
      }, {});
  });

  return activeBaseCountries()
    .map((country) => {
      const averageRank = (profileRankings[0][country.id] + profileRankings[1][country.id]) / 2;

      return {
        ...country,
        averageRank,
        meta: `Avg rank ${averageRank.toFixed(1)}`
      };
    })
    .sort((a, b) => a.averageRank - b.averageRank || a.name.localeCompare(b.name));
}

function renderLovedList() {
  els.lovedControls.hidden = session.mode !== "partner";
  lovedView = session.mode === "partner" ? lovedView : "me";
  els.lovedMe.textContent = getProfileName("me");
  els.lovedPartner.textContent = getProfileName("partner");
  els.lovedMe.classList.toggle("active", lovedView === "me");
  els.lovedPartner.classList.toggle("active", lovedView === "partner");

  const lovedCountries = session.profiles[lovedView].loved
    .map((id) => countryById.get(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  els.lovedList.innerHTML = lovedCountries.length
    ? lovedCountries.map((country) => (
      `<li><a href="${wikipediaUrl(country.name)}" target="_blank" rel="noopener">${escapeHtml(country.name)}</a></li>`
    )).join("")
    : `<li class="empty-list">No loved countries yet.</li>`;
}

function renderRemovedList() {
  const removedCountries = session.removedCountryIds
    .map((id) => countryById.get(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  els.removedList.innerHTML = removedCountries.length
    ? removedCountries.map((country) => (
      `<li><a href="${wikipediaUrl(country.name)}" target="_blank" rel="noopener">${escapeHtml(country.name)}</a></li>`
    )).join("")
    : `<li class="empty-list">No removed countries yet.</li>`;
}

function renderCommentsFeed() {
  const comments = ["me", "partner"].flatMap((profileName) => (
    Object.entries(session.profiles[profileName].comments || {}).map(([countryId, comment]) => ({
      profileName,
      country: countryById.get(countryId),
      text: comment.text,
      updatedAt: comment.updatedAt
    }))
  ))
    .filter((item) => item.country && item.text)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  els.commentsFeed.innerHTML = comments.length
    ? comments.map((item) => (
      `<li><strong><a href="${wikipediaUrl(item.country.name)}" target="_blank" rel="noopener">${escapeHtml(item.country.name)}</a> · ${escapeHtml(getProfileName(item.profileName))}</strong><span>${escapeHtml(item.text)}</span></li>`
    )).join("")
    : `<li class="empty-list">No comments yet.</li>`;
}

function renderDonationFooter() {
  els.donationFooter.hidden = Boolean(getActiveProfile().donationHidden);
}

function showFloatingTooltip(target) {
  const text = target.dataset.tooltip;

  if (!text) {
    return;
  }

  els.floatingTooltip.textContent = text;
  els.floatingTooltip.hidden = false;

  const targetRect = target.getBoundingClientRect();
  const tooltipRect = els.floatingTooltip.getBoundingClientRect();
  const gap = 10;
  const margin = 12;
  let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
  let top = targetRect.top - tooltipRect.height - gap;

  left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));

  if (top < margin) {
    top = targetRect.bottom + gap;
  }

  top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
  els.floatingTooltip.style.left = `${left}px`;
  els.floatingTooltip.style.top = `${top}px`;
}

function hideFloatingTooltip() {
  els.floatingTooltip.hidden = true;
}

function activeBaseCountries() {
  return baseCountries.filter((country) => !isRemoved(country.id));
}

function isRemoved(countryId) {
  return session?.removedCountryIds?.includes(countryId);
}

function toggleLove(countryId) {
  const loved = getActiveProfile().loved;
  const index = loved.indexOf(countryId);

  if (index >= 0) {
    loved.splice(index, 1);
  } else {
    loved.push(countryId);
  }

  saveSession();
  renderApp(index >= 0 ? "Removed from loved countries" : "Saved to loved countries");
}

function saveComment(countryId, value) {
  const text = String(value || "").trim();
  const comments = getActiveProfile().comments;

  if (text) {
    comments[countryId] = {
      text,
      updatedAt: new Date().toISOString()
    };
  } else {
    delete comments[countryId];
  }

  saveSession();
  renderApp(text ? "Comment saved" : "Comment removed");
}

function handleRemoval(countryId) {
  const countryName = countryById.get(countryId)?.name || "Country";

  if (session.mode === "solo") {
    removeCountry(countryId, `${countryName} removed from future matchups`);
    return;
  }

  const suggestedBy = session.removalSuggestions[countryId];

  if (suggestedBy && suggestedBy !== session.activeProfile) {
    removeCountry(countryId, `${countryName} removed by agreement`);
    return;
  }

  session.removalSuggestions[countryId] = session.activeProfile;
  saveSession();
  renderApp(`${countryName} removal suggested`);
}

function removeCountry(countryId, message) {
  if (!session.removedCountryIds.includes(countryId)) {
    session.removedCountryIds.push(countryId);
  }

  delete session.removalSuggestions[countryId];

  ["me", "partner"].forEach((profileName) => {
    const profile = session.profiles[profileName];
    profile.currentPair = normalizePair(profile.currentPair)?.includes(countryId) ? null : profile.currentPair;
  });

  saveSession();
  renderApp(message);
}

function renderRankingControls() {
  els.rankingControls.hidden = session.mode !== "partner";
  els.viewMe.textContent = getProfileName("me");
  els.viewPartner.textContent = getProfileName("partner");
  els.viewTogether.classList.toggle("active", rankingView === "together");
  els.viewMe.classList.toggle("active", rankingView === "me" || (rankingView === "active" && session.activeProfile === "me"));
  els.viewPartner.classList.toggle("active", rankingView === "partner" || (rankingView === "active" && session.activeProfile === "partner"));
}

function wikipediaUrl(name) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, "_"))}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function resetActiveRanking() {
  const previousProfile = getActiveProfile();
  session.profiles[session.activeProfile] = makeProfile();
  session.profiles[session.activeProfile].loved = previousProfile.loved;
  session.profiles[session.activeProfile].comments = previousProfile.comments;
  session.profiles[session.activeProfile].donationHidden = previousProfile.donationHidden;
  session.profiles[session.activeProfile].currentPair = pickPairIds();
  saveSession();
  renderApp("Active ranking reset");
}

function switchProfile() {
  session.activeProfile = session.activeProfile === "me" ? "partner" : "me";
  rankingView = "active";
  lovedView = session.activeProfile;

  if (!getActiveProfile().currentPair) {
    getActiveProfile().currentPair = pickPairIds();
  }

  saveSession();
  renderApp(`${getProfileName(session.activeProfile)} profile loaded`);
}

function newSessionNames() {
  return {
    me: cleanName(els.meNameInput.value, "Me"),
    partner: cleanName(els.partnerNameInput.value, "Partner")
  };
}

function updateProfileChoiceLabels() {
  els.chooseMe.textContent = getProfileName("me");
  els.choosePartner.textContent = getProfileName("partner");
}

els.showExistingSession.addEventListener("click", () => {
  els.existingMessage.textContent = "";
  els.passcodeInput.value = "";
  showPanel(els.existingPanel);
  els.passcodeInput.focus();
});

els.showNewSession.addEventListener("click", () => {
  els.newPasscode.textContent = generatePasscode();
  els.meNameInput.value = "";
  els.partnerNameInput.value = "";
  showPanel(els.newPanel);
  els.meNameInput.focus();
});

els.passcodeInput.addEventListener("input", () => {
  els.passcodeInput.value = normalizePasscode(els.passcodeInput.value);
});

els.backToWelcomeFromExisting.addEventListener("click", () => showPanel(els.welcomePanel));
els.backToWelcomeFromNew.addEventListener("click", () => showPanel(els.welcomePanel));

els.loadSession.addEventListener("click", () => {
  const result = loadSessionByPasscode(els.passcodeInput.value);

  if (result.error) {
    els.existingMessage.textContent = result.error;
    return;
  }

  if (result.session.mode === "partner") {
    session = result.session;
    updateProfileChoiceLabels();
    saveSession();
    showPanel(els.profilePanel);
    return;
  }

  beginSession(result.session);
});

els.passcodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    els.loadSession.click();
  }
});

els.startSolo.addEventListener("click", () => {
  beginSession(makeSession(els.newPasscode.textContent, "solo", newSessionNames()));
});

els.startPartner.addEventListener("click", () => {
  session = makeSession(els.newPasscode.textContent, "partner", newSessionNames());
  updateProfileChoiceLabels();
  saveSession();
  showPanel(els.profilePanel);
});

els.chooseMe.addEventListener("click", () => beginSession(session, "me"));
els.choosePartner.addEventListener("click", () => beginSession(session, "partner"));

els.leftChoose.addEventListener("click", () => {
  applyWin(currentPair[0], currentPair[1]);
  advance(`${currentPair[0].name} chosen`);
});

els.rightChoose.addEventListener("click", () => {
  applyWin(currentPair[1], currentPair[0]);
  advance(`${currentPair[1].name} chosen`);
});

els.hardChoice.addEventListener("click", () => {
  applyHardChoice(currentPair[0], currentPair[1]);
  advance("Hard to choose: both countries got a small boost");
});

els.skipPair.addEventListener("click", () => {
  getActiveProfile().currentPair = pickPairIds();
  saveSession();
  renderApp("Skipped pair");
});

els.resetRatings.addEventListener("click", resetActiveRanking);
els.switchProfile.addEventListener("click", switchProfile);
els.viewTogether.addEventListener("click", () => {
  rankingView = "together";
  rankingsExpanded = false;
  renderRankings();
});
els.viewMe.addEventListener("click", () => {
  rankingView = "me";
  rankingsExpanded = false;
  renderRankings();
});
els.viewPartner.addEventListener("click", () => {
  rankingView = "partner";
  rankingsExpanded = false;
  renderRankings();
});
els.lovedMe.addEventListener("click", () => {
  lovedView = "me";
  renderLovedList();
});
els.lovedPartner.addEventListener("click", () => {
  lovedView = "partner";
  renderLovedList();
});
els.hideDonation.addEventListener("click", () => {
  getActiveProfile().donationHidden = true;
  saveSession();
  renderDonationFooter();
});
els.openHelp.addEventListener("click", () => {
  els.helpModal.showModal();
});
els.closeHelp.addEventListener("click", () => {
  els.helpModal.close();
});
els.helpModal.addEventListener("click", (event) => {
  if (event.target === els.helpModal) {
    els.helpModal.close();
  }
});
document.addEventListener("mouseover", (event) => {
  const target = event.target.closest(".has-tooltip");

  if (target) {
    showFloatingTooltip(target);
  }
});
document.addEventListener("focusin", (event) => {
  const target = event.target.closest(".has-tooltip");

  if (target) {
    showFloatingTooltip(target);
  }
});
document.addEventListener("mouseout", (event) => {
  if (event.target.closest(".has-tooltip")) {
    hideFloatingTooltip();
  }
});
document.addEventListener("focusout", (event) => {
  if (event.target.closest(".has-tooltip")) {
    hideFloatingTooltip();
  }
});
window.addEventListener("pagehide", () => {
  saveSession();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveSession();
  }
});
els.toggleRankings.addEventListener("click", () => {
  rankingsExpanded = !rankingsExpanded;
  renderRankings();
});
els.changeSession.addEventListener("click", () => {
  session = null;
  els.onboarding.hidden = false;
  showPanel(els.welcomePanel);
});

els.closeModal.addEventListener("click", () => {
  els.photoModal.close();
});

els.photoModal.addEventListener("click", (event) => {
  if (event.target === els.photoModal) {
    els.photoModal.close();
  }
});

showPanel(els.welcomePanel);
els.appVersionLabel.textContent = APP_VERSION;
