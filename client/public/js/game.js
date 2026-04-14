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
const pendingUno = {};
const playerNames = {};

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "join_room", room_id: parseInt(roomId), token }));
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "game_started") {
    renderTopCard(msg.top_card);
    updateTurnIndicator(msg.current_player_id);
  }
  if (msg.type === "hand_update") {
    if (msg.your_id) {
      myId = msg.your_id;
      playerNames[myId] = username;
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
    btn.addEventListener("click", () => {
      const payload = { type: "play_card", card_id: card.card_id };
      if ([11, 12].includes(card.card_id)) {
        const color = parseInt(prompt("Choisis une couleur :\n1 = Rouge\n2 = Bleu\n3 = Vert\n4 = Jaune") || "1");
        if (!color || color < 1 || color > 4) return;
        payload.color = color;
      }
      ws.send(JSON.stringify(payload));
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
  updateUnoBtn(hand.length);
}


function renderOpponents(players) {
  const list = document.getElementById("opponent-list");
  list.innerHTML = "";
  players
    .filter((p) => p.id !== username)
    .forEach((p) => {
      const li = document.createElement("li");
      li.id = `opponent-${p.id}`;
      li.textContent = `${p.name} - ${p.card_count} carte(s)`;
      list.appendChild(li);
    });
}

const unoBtn = document.getElementById("uno-btn");
const counterUnoBtn = document.getElementById("counter-uno-btn");

function updateUnoBtn(count) {
  unoBtn.disabled = count !== 1;
}

function updateCounterUnoBtn() {
  const hasPending = Object.keys(pendingUno).some((id) => parseInt(id) !== myId);
  counterUnoBtn.disabled = !hasPending;
}

unoBtn.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "uno" }));
  unoBtn.disabled = true;
});

counterUnoBtn.addEventListener("click", () => {
  const target = Object.keys(pendingUno).map(Number).find((id) => id !== myId);
  if (!target) return;
  ws.send(JSON.stringify({ type: "counter_uno", target_id: target }));
  counterUnoBtn.disabled = true;
});

document.getElementById("draw-btn").addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "draw_card" }));
});

document.getElementById("leave-btn").addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "leave_room" }));
  window.location.href = "/";
});

function showNotification(text) {
  const el = document.getElementById("notification");
  el.textContent = text;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 3000);
}

function updateOpponentCount(player_id, addedCount) {
  const el = document.getElementById(`opponent-${player_id}`);
  if (!el) return;
  const match = el.textContent.match(/(\d+) carte/);
  const current = match ? parseInt(match[1]) : 0;
  el.textContent = el.textContent.replace(/\d+ carte\(s\)/, `${current + addedCount} carte(s)`);
}

function updateDirectionIndicator(direction) {
  const el = document.getElementById("direction-indicator");
  el.textContent = direction === 1 ? "Sens : →" : "Sens : ←";
}
