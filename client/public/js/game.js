const token    = localStorage.getItem("uno_token");
const username = localStorage.getItem("uno_username");
const roomId   = localStorage.getItem("uno_room_id");

if (!token || !roomId) window.location.href = "/";

document.getElementById("current-player-name").textContent = username;

// ─── Constantes ───────────────────────────────────────────────────────────────

const COLOR_HEX = { 1: "#F63A3A", 2: "#F6E747", 3: "#5DF55D", 4: "#565EF5" };

const CARD_SVG = {
  0:  "/public/assets/cards/0.svg",
  1:  "/public/assets/cards/1.svg",
  2:  "/public/assets/cards/2.svg",
  3:  "/public/assets/cards/3.svg",
  4:  "/public/assets/cards/4.svg",
  5:  "/public/assets/cards/5.svg",
  6:  "/public/assets/cards/6.svg",
  7:  "/public/assets/cards/7.svg",
  8:  "/public/assets/cards/8.svg",
  9:  "/public/assets/cards/9.svg",
  10: "/public/assets/cards/+2.svg",
  11: "/public/assets/cards/+4.svg",
  12: "/public/assets/cards/colors.svg",
  13: "/public/assets/cards/block.svg",
  14: "/public/assets/cards/change_direction.svg",
};

// Cache SVG texte
const svgCache = {};
async function loadSVG(url) {
  if (!svgCache[url]) {
    const r = await fetch(url);
    svgCache[url] = await r.text();
  }
  return svgCache[url];
}

// Précharge toutes les SVG
Object.values(CARD_SVG).forEach(loadSVG);

// Crée un élément SVG coloré
function makeSVGEl(svgText, color) {
  const wrap = document.createElement("div");
  wrap.innerHTML = svgText.trim();
  const svg = wrap.firstChild;
  // Les SVG de nombres ont le rect de fond en premier
  const rect = svg.querySelector("rect");
  if (rect && color) rect.setAttribute("fill", color);
  svg.style.width  = "100%";
  svg.style.height = "100%";
  svg.style.borderRadius = "10px";
  return svg;
}

// ─── État ─────────────────────────────────────────────────────────────────────

let myHand           = [];   // [{ card_id, color }]
let currentPlayerId  = null;
let currentColor     = null;
let lastCard         = null;
let pendingUno       = {};
let pendingWildIndex = null;

// ─── WebSocket ────────────────────────────────────────────────────────────────

const ws = new WebSocket(`ws://${location.host}`, ["Authorization", token]);

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "join_room", room_id: roomId, player_id: username, name: username }));
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case "game_started":
    case "card_played":
    case "player_drew":
    case "uno_claimed":
      applyPublicState(msg);
      break;

    case "hand_update":
      myHand = msg.cards;
      renderHand();
      updateUnoBtn();
      break;

    case "uno_pending":
      pendingUno[msg.player_id] = true;
      toast(`${msg.player_id} dit UNO !`, "good");
      updateCounterBtn();
      break;

    case "game_over":
      showGameOver(msg.winner_id);
      break;

    case "play_error":
      toast(friendlyError(msg.error), "bad");
      break;

    case "draw_error":
      toast(friendlyError(msg.error), "bad");
      break;

    case "error":
      toast(msg.error, "bad");
      break;
  }
});

function friendlyError(e) {
  const map = {
    not_your_turn:  "Ce n'est pas votre tour.",
    cannot_play:    "Vous ne pouvez pas jouer cette carte.",
    color_required: "Choisissez une couleur.",
    invalid_card:   "Carte invalide.",
    not_uno:        "Vous n'avez pas 1 seule carte.",
    no_pending:     "Personne n'a dit UNO.",
  };
  return map[e] ?? e;
}

// ─── Appliquer l'état public ──────────────────────────────────────────────────

function applyPublicState(msg) {
  if (msg.current_player_id !== undefined) currentPlayerId = msg.current_player_id;
  if (msg.color     !== undefined) currentColor = msg.color;
  if (msg.last_card !== undefined) lastCard     = msg.last_card;

  // Nettoyer UNO pending si uno_claimed
  if (msg.type === "uno_claimed") {
    delete pendingUno[msg.target_id];
    if (msg.caller_id !== username) toast(`${msg.caller_id} a contré UNO de ${msg.target_id} !`, "good");
    updateCounterBtn();
  }

  renderTopCard();
  renderColorIndicator();
  renderOpponents(msg.card_counts ?? {});
  renderTurnBadge();
  renderHand(); // re-render pour mettre à jour les jouables
}

// ─── Carte du dessus (défausse) ───────────────────────────────────────────────

async function renderTopCard() {
  const el = document.getElementById("current-card");
  el.innerHTML = "";
  if (!lastCard) { el.innerHTML = `<span class="slot-label">Défausse</span>`; return; }

  const url = CARD_SVG[lastCard.card_id];
  if (!url) return;
  const svgText = await loadSVG(url);
  const color   = lastCard.color ? COLOR_HEX[lastCard.color] : null;
  el.appendChild(makeSVGEl(svgText, color));
}

// ─── Indicateur de couleur ────────────────────────────────────────────────────

function renderColorIndicator() {
  const el = document.getElementById("color-indicator");
  el.style.background = currentColor ? COLOR_HEX[currentColor] : "#333";
  el.classList.toggle("lit", !!currentColor);
  el.style.color = currentColor ? COLOR_HEX[currentColor] : "transparent";
}

// ─── Badge de tour ────────────────────────────────────────────────────────────

function renderTurnBadge() {
  const el      = document.getElementById("turn-badge");
  const isMyTurn = String(currentPlayerId) === String(username);
  const displayName = isBot(currentPlayerId) ? formatBotName(currentPlayerId) : currentPlayerId;
  el.textContent = isMyTurn ? "C'est votre tour !" : `Tour de ${displayName ?? "…"}`;
  el.classList.toggle("my-turn", isMyTurn);
  document.getElementById("draw-btn").disabled = !isMyTurn;
}

// ─── Adversaires ──────────────────────────────────────────────────────────────

function isBot(pid) {
  return String(pid).startsWith("bot_");
}

function formatBotName(pid) {
  // "bot_3" → "Bot 3"
  return "Bot " + String(pid).replace("bot_", "");
}

function renderOpponents(counts) {
  const list = document.getElementById("opponent-list");
  list.innerHTML = "";
  Object.entries(counts).forEach(([pid, count]) => {
    if (String(pid) === String(username)) return;
    const li    = document.createElement("li");
    const isActive = String(pid) === String(currentPlayerId);
    const bot   = isBot(pid);
    li.className = `opponent-card${isActive ? " active" : ""}`;
    const displayName = bot ? formatBotName(pid) : String(pid);
    const initial = bot ? "B" : displayName.charAt(0).toUpperCase();
    li.innerHTML = `
      <div class="opponent-avatar${bot ? " bot-avatar" : ""}">${initial}</div>
      <span class="opponent-name">${displayName}</span>
      <span class="opponent-count">${count} carte${count > 1 ? "s" : ""}</span>
    `;
    list.appendChild(li);
  });
}

// ─── Main du joueur ───────────────────────────────────────────────────────────

async function renderHand() {
  const list    = document.getElementById("player-cards");
  list.innerHTML = "";
  const isMyTurn = String(currentPlayerId) === String(username);

  for (let i = 0; i < myHand.length; i++) {
    const card    = myHand[i];
    const playable = isMyTurn && canPlay(card);

    const li  = document.createElement("li");
    const div = document.createElement("div");
    div.className = `hand-card noselect ${playable ? "playable" : "not-playable"}`;
    div.title = playable ? "Jouer cette carte" : "";

    // SVG coloré
    const url = CARD_SVG[card.card_id];
    if (url) {
      const svgText = await loadSVG(url);
      const color   = card.color ? COLOR_HEX[card.color] : null;
      div.appendChild(makeSVGEl(svgText, color));
    }

    if (playable) {
      div.addEventListener("click", () => handlePlay(i, card));
    }

    li.appendChild(div);
    list.appendChild(li);
  }
}

// ─── Peut-on jouer cette carte ? ─────────────────────────────────────────────

function canPlay(card) {
  if (lastCard === null) return true;
  const isWild = card.card_id === 11 || card.card_id === 12;
  if (isWild) return true;
  return card.color === currentColor || card.card_id === lastCard.card_id;
}

// ─── Jouer ────────────────────────────────────────────────────────────────────

function handlePlay(index, card) {
  const isWild = card.card_id === 11 || card.card_id === 12;
  if (isWild) {
    pendingWildIndex = index;
    showColorModal();
  } else {
    sendPlay(index, null);
  }
}

function sendPlay(index, chosenColor) {
  ws.send(JSON.stringify({
    type:         "play_card",
    room_id:      roomId,
    player_id:    username,
    card_index:   index,
    chosen_color: chosenColor,
  }));
}

// ─── Modal couleur ────────────────────────────────────────────────────────────

function showColorModal() {
  document.getElementById("color-modal").classList.remove("hidden");
}

document.querySelectorAll(".color-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("color-modal").classList.add("hidden");
    if (pendingWildIndex !== null) {
      sendPlay(pendingWildIndex, Number(btn.dataset.color));
      pendingWildIndex = null;
    }
  });
});

// ─── Piocher ──────────────────────────────────────────────────────────────────

document.getElementById("draw-btn").addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "draw_card", room_id: roomId, player_id: username }));
});

// ─── UNO ──────────────────────────────────────────────────────────────────────

const unoBtn     = document.getElementById("uno-btn");
const counterBtn = document.getElementById("counter-uno-btn");

function updateUnoBtn()  { unoBtn.disabled = myHand.length !== 1; }
function updateCounterBtn() {
  const has = Object.keys(pendingUno).some((id) => String(id) !== String(username));
  counterBtn.disabled = !has;
}

unoBtn.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "uno", room_id: roomId, player_id: username }));
  unoBtn.disabled = true;
});

counterBtn.addEventListener("click", () => {
  const target = Object.keys(pendingUno).find((id) => String(id) !== String(username));
  if (!target) return;
  ws.send(JSON.stringify({ type: "counter_uno", room_id: roomId, player_id: username, target_id: target }));
});

// ─── Game over ────────────────────────────────────────────────────────────────

function showGameOver(winner_id) {
  const isWinner = String(winner_id) === String(username);
  const winnerName = isBot(winner_id) ? formatBotName(winner_id) : winner_id;
  document.getElementById("gameover-title").textContent = isWinner ? "🎉 Vous avez gagné !" : `${winnerName} a gagné !`;
  document.getElementById("gameover-sub").textContent   = isWinner ? "Félicitations !" : "Meilleure chance la prochaine fois.";
  document.getElementById("gameover-modal").classList.remove("hidden");
}

document.getElementById("back-lobby-btn").addEventListener("click", () => {
  window.location.href = "/lobby";
});

// ─── Toasts ───────────────────────────────────────────────────────────────────

function toast(msg, type = "") {
  const container = document.getElementById("toast-container");
  const div = document.createElement("div");
  div.className = `toast${type ? ` toast-${type}` : ""}`;
  div.textContent = msg;
  container.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.getElementById("draw-btn").disabled = true;
