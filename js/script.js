const K = 32;
const START_ELO = 1200;

const countries = [
  { name: "Japan", emoji: "🇯🇵" }, { name: "Portugal", emoji: "🇵🇹" },
  { name: "Italy", emoji: "🇮🇹" }, { name: "New Zealand", emoji: "🇳🇿" },
  { name: "Iceland", emoji: "🇮🇸" }, { name: "Greece", emoji: "🇬🇷" },
  { name: "Peru", emoji: "🇵🇪" }, { name: "Thailand", emoji: "🇹🇭" },
  { name: "Morocco", emoji: "🇲🇦" }, { name: "Egypt", emoji: "🇪🇬" },
  { name: "Norway", emoji: "🇳🇴" }, { name: "Argentina", emoji: "🇦🇷" },
  { name: "Mexico", emoji: "🇲🇽" }, { name: "Turkey", emoji: "🇹🇷" },
  { name: "Vietnam", emoji: "🇻🇳" }, { name: "South Africa", emoji: "🇿🇦" }
];

const players = ["you", "partner"];
const playerLabels = { you: "👤 You", partner: "💑 Partner" };

const state = {
  currentPlayer: "you",
  activePair: null,
  view: "combined",
  ratings: Object.fromEntries(players.map((p) => [p, Object.fromEntries(countries.map((c) => [c.name, START_ELO]))])),
  matches: Object.fromEntries(countries.map((c) => [c.name, 0]))
};

function expectedScore(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function applyMatch(player, winnerName, loserName, tie = false) {
  const r = state.ratings[player];
  const rw = r[winnerName];
  const rl = r[loserName];
  const ew = expectedScore(rw, rl);
  const el = expectedScore(rl, rw);

  const sw = tie ? 0.5 : 1;
  const sl = tie ? 0.5 : 0;

  r[winnerName] = Math.round(rw + K * (sw - ew));
  r[loserName] = Math.round(rl + K * (sl - el));
  state.matches[winnerName] += 1;
  state.matches[loserName] += 1;
}

function choosePair() {
  const sorted = [...countries].sort((a, b) => state.matches[a.name] - state.matches[b.name]);
  const left = sorted[0];
  const pool = sorted.slice(1, 6);
  const right = pool[Math.floor(Math.random() * pool.length)] || sorted[1];
  state.activePair = [left, right];
}

function renderPlayerSelect() {
  const select = document.getElementById("playerSelect");
  select.innerHTML = players.map((p) => `<option value="${p}">${playerLabels[p]}</option>`).join("");
  select.value = state.currentPlayer;
  select.addEventListener("change", (e) => {
    state.currentPlayer = e.target.value;
    renderBattle();
  });
}

function countryCard(country, side) {
  const r = state.ratings[state.currentPlayer][country.name];
  return `<button class="card" data-side="${side}">
    <div class="emoji">${country.emoji}</div>
    <h3>${country.name}</h3>
    <p>ELO: ${r}</p>
  </button>`;
}

function renderBattle() {
  if (!state.activePair) choosePair();
  const [a, b] = state.activePair;
  const battle = document.getElementById("battle");
  battle.innerHTML = `${countryCard(a, "left")}<div class="vs">VS</div>${countryCard(b, "right")}`;

  battle.querySelector('[data-side="left"]').onclick = () => completePick(a, b, false);
  battle.querySelector('[data-side="right"]').onclick = () => completePick(b, a, false);
}

function completePick(winner, loser, tie) {
  applyMatch(state.currentPlayer, winner.name, loser.name, tie);
  choosePair();
  renderBattle();
  renderRankings();
}

function ratingForView(countryName) {
  const y = state.ratings.you[countryName];
  const p = state.ratings.partner[countryName];
  if (state.view === "you") return y;
  if (state.view === "partner") return p;
  return Math.round((y + p) / 2);
}

function renderRankings() {
  const list = document.getElementById("rankingList");
  const ranked = [...countries]
    .map((c) => ({ ...c, score: ratingForView(c.name), disagreement: Math.abs(state.ratings.you[c.name] - state.ratings.partner[c.name]) }))
    .sort((a, b) => b.score - a.score);

  list.innerHTML = ranked.map((c) => `<li>
    <span>${c.emoji} ${c.name}</span>
    <strong>${c.score}</strong>
    <small>Δ ${c.disagreement}</small>
  </li>`).join("");
}

function wireUi() {
  document.getElementById("nextPairBtn").onclick = () => {
    choosePair();
    renderBattle();
  };

  document.getElementById("tieBtn").onclick = () => {
    const [a, b] = state.activePair;
    completePick(a, b, true);
  };

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.view = btn.dataset.view;
      renderRankings();
    };
  });
}

function init() {
  renderPlayerSelect();
  wireUi();
  choosePair();
  renderBattle();
  renderRankings();
}

document.addEventListener("DOMContentLoaded", init);
