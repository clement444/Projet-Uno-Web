const token = localStorage.getItem("uno_token");
const username = localStorage.getItem("uno_username");
const roomId = localStorage.getItem("uno_room_id");

if (!token || !roomId) window.location.href = "/";

document.getElementById("current-player-name").textContent = username;
document.getElementById("room-name").textContent = localStorage.getItem("uno_room_name") ?? "";

const CARD_ASSETS = [
  "0","1","2","3","4","5","6","7","8","9",
  "+2","+4","colors","block","change_direction",
  "fire","eye","shuffle","deck"
];
const COLOR_BG = { 0: "#333", 1: "#F63A3A", 2: "#565EF5", 3: "#5DF55D", 4: "#F5D55D" };

const ws = new WebSocket(`ws://${location.host}`);
let myId = null;
let isMyTurn = false;
let currentPlayerId = null;
const pendingUno = {};
const playerNames = {};

const unoBtn = document.getElementById("uno-btn");
const counterUnoBtn = document.getElementById("counter-uno-btn");
const jouerBtn = document.getElementById("jouer-btn");

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "join_room", room_id: parseInt(roomId), token }));
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "game_started") {
    renderTopCard(msg.top_card);
    currentPlayerId = msg.current_player_id;
    if (myId !== null) updateTurnIndicator(currentPlayerId);
  }
  if (msg.type === "hand_update") {
    if (msg.your_id) {
      myId = msg.your_id;
      playerNames[myId] = username;
      if (currentPlayerId !== null) updateTurnIndicator(currentPlayerId);
    }
    msg.opponents.forEach((p) => { playerNames[p.id] = p.username; });
    renderHand(msg.hand);
    renderOpponents(msg.opponents);
  }
  if (msg.type === "card_played") {
    renderTopCard({ id: msg.card_id, color: msg.color });
    if (msg.player_id !== myId) updateOpponentCount(msg.player_id, -1);
  }
  if (msg.type === "turn") {
    updateTurnIndicator(msg.player_id);
  }
  if (msg.type === "uno_declared") {
    pendingUno[msg.player_id] = true;
    updateCounterUnoBtn();
  }
  if (msg.type === "draw_forced") {
    const name = playerNames[msg.player_id] ?? `Joueur ${msg.player_id}`;
    showNotification(`${name} pioche ${msg.count} carte(s) !`);
    updateOpponentCount(msg.player_id, msg.count);
  }
  if (msg.type === "player_skipped") {
    const name = playerNames[msg.player_id] ?? `Joueur ${msg.player_id}`;
    showNotification(`${name} est passé !`);
  }
  if (msg.type === "direction_changed") {
    updateDirectionIndicator(msg.direction);
  }
  if (msg.type === "card_drawn") {
    if (msg.player_id !== myId) updateOpponentCount(msg.player_id, 1);
  }
  if (msg.type === "counter_uno") {
    delete pendingUno[msg.target_id];
    updateCounterUnoBtn();
    if (msg.target_id !== myId) updateOpponentCount(msg.target_id, 2);
  }
  if (msg.type === "player_disconnected") {
    const name = playerNames[msg.player_id] ?? `Joueur ${msg.player_id}`;
    showNotification(`${name} s'est déconnecté.`);
    const el = document.getElementById(`opponent-${msg.player_id}`);
    if (el) el.remove();
  }
  if (msg.type === "game_over") {
    const name = playerNames[msg.winner_id] ?? `Joueur ${msg.winner_id}`;
    const text = msg.winner_id === myId ? "Tu as gagné !" : `Partie terminée — gagnant : ${name}`;
    showNotification(text);
    setTimeout(() => { window.location.href = "/"; }, 4000);
  }
});

function renderTopCard(card) {
  const el = document.getElementById("current-card");
  el.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "card-face-pile";
  wrapper.style.background = COLOR_BG[card.color] || "#333";
  const img = document.createElement("img");
  img.src = `/public/assets/cards/${CARD_ASSETS[card.id]}.svg`;
  img.alt = CARD_ASSETS[card.id];
  wrapper.appendChild(img);
  el.appendChild(wrapper);
}

function updateTurnIndicator(player_id) {
  isMyTurn = player_id === myId;
  document.getElementById("draw-btn").disabled = !isMyTurn;
  jouerBtn.disabled = !isMyTurn;
  document.getElementById("turn-indicator").textContent = isMyTurn
    ? "C'est ton tour !"
    : `Tour de ${playerNames[player_id] ?? `joueur ${player_id}`}`;
  document.querySelectorAll("#player-cards button").forEach((btn) => {
    btn.disabled = !isMyTurn;
  });
}

function renderHand(hand) {
  const list = document.getElementById("player-cards");
  list.innerHTML = "";
  hand.forEach((card) => {
    const li = document.createElement("li");
    li.className = "hand-slot";
    const btn = document.createElement("button");
    btn.className = "card-face";
    btn.style.background = COLOR_BG[card.color] || "#333";
    btn.disabled = !isMyTurn;
    const img = document.createElement("img");
    img.src = `/public/assets/cards/${CARD_ASSETS[card.card_id]}.svg`;
    img.alt = CARD_ASSETS[card.card_id];
    btn.appendChild(img);
    btn.addEventListener("click", async () => {
      const payload = { type: "play_card", card_id: card.card_id };
      if ([11, 12].includes(card.card_id)) {
        const color = await askColor();
        if (!color) return;
        payload.color = color;
      }
      ws.send(JSON.stringify(payload));
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
  updateUnoBtn(hand.length);
}


const opponentData = new Map();

function renderOpponents(opponents) {
  document.getElementById("opponent-list").innerHTML = "";
  opponentData.clear();
  opponents.forEach((p) => {
    opponentData.set(p.id, { username: p.username, card_count: p.card_count });
    renderOpponent(p.id);
  });
}

function renderOpponent(id) {
  const data = opponentData.get(id);
  if (!data) return;
  const list = document.getElementById("opponent-list");
  let li = document.getElementById(`opponent-${id}`);
  if (!li) {
    li = document.createElement("li");
    li.id = `opponent-${id}`;
    li.className = "opponent";
    list.appendChild(li);
  }
  li.innerHTML = "";

  const nameEl = document.createElement("span");
  nameEl.className = "opponent-name";
  nameEl.textContent = data.username;

  const stack = document.createElement("div");
  stack.className = "opponent-card-stack";
  const show = Math.min(data.card_count, 8);
  stack.style.width = `${Math.max(42, 42 + (show - 1) * 16)}px`;
  for (let i = 0; i < show; i++) {
    const card = document.createElement("div");
    card.className = "card-back-mini";
    card.style.left = `${i * 16}px`;
    const img = document.createElement("img");
    img.src = "/public/assets/cards/uno_recto.svg";
    card.appendChild(img);
    stack.appendChild(card);
  }

  const badge = document.createElement("span");
  badge.className = "card-count-badge";
  badge.textContent = data.card_count;

  li.appendChild(nameEl);
  li.appendChild(stack);
  li.appendChild(badge);
}

function updateUnoBtn(count) {
  const show = count === 1;
  unoBtn.hidden = !show;
  unoBtn.disabled = !show;
}

function updateCounterUnoBtn() {
  const hasPending = Object.keys(pendingUno).some((id) => parseInt(id) !== myId);
  counterUnoBtn.hidden = !hasPending;
  counterUnoBtn.disabled = !hasPending;
}

unoBtn.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "uno" }));
  unoBtn.hidden = true;
  unoBtn.disabled = true;
});

counterUnoBtn.addEventListener("click", () => {
  const target = Object.keys(pendingUno).map(Number).find((id) => id !== myId);
  if (!target) return;
  ws.send(JSON.stringify({ type: "counter_uno", target_id: target }));
  counterUnoBtn.hidden = true;
  counterUnoBtn.disabled = true;
});

jouerBtn.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "draw_card" }));
});

document.getElementById("draw-btn").addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "draw_card" }));
});

document.getElementById("leave-btn").addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "leave_room" }));
  window.location.href = "/";
});

function askColor() {
  return new Promise((resolve) => {
    const picker = document.getElementById("color-picker");
    picker.hidden = false;
    function onPick(e) {
      const btn = e.target.closest("button[data-color]");
      if (!btn) return;
      picker.hidden = true;
      picker.removeEventListener("click", onPick);
      resolve(parseInt(btn.dataset.color));
    }
    picker.addEventListener("click", onPick);
  });
}

function showNotification(text) {
  const el = document.getElementById("notification");
  el.textContent = text;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 3000);
}

function updateOpponentCount(player_id, delta) {
  const data = opponentData.get(player_id);
  if (!data) return;
  data.card_count = Math.max(0, data.card_count + delta);
  renderOpponent(player_id);
}

function updateDirectionIndicator(direction) {
  const el = document.getElementById("direction-indicator");
  el.textContent = direction === 1 ? "Sens : →" : "Sens : ←";
}
