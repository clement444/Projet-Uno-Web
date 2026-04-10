const token = localStorage.getItem("uno_token");
const username = localStorage.getItem("uno_username");
const roomId = localStorage.getItem("uno_room_id");

if (!token || !roomId) window.location.href = "/";

document.getElementById("current-player-name").textContent = username;

const ws = new WebSocket(`ws://${location.host}?token=${token}`);
let myCardCount = 0;
let pendingUno = {};

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "join_room", room_id: roomId, player_id: username, name: username }));
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "card_played") updateCurrentCard(msg.card_id);
  if (msg.type === "card_drawn") addCardToHand(msg.card_id);
  if (msg.type === "hand_update") renderHand(msg.cards);
  if (msg.type === "opponent_update") renderOpponents(msg.players);
  if (msg.type === "uno_pending") {
    pendingUno[msg.player_id] = true;
    if (msg.player_id !== username) updateCounterUnoBtn();
  }
  if (msg.type === "uno_claimed") {
    delete pendingUno[msg.player_id];
    updateCounterUnoBtn();
  }
});

function updateCurrentCard(cardId) {
  document.getElementById("current-card").textContent = cardId;
}

function renderHand(cards) {
  const list = document.getElementById("player-cards");
  list.innerHTML = "";
  myCardCount = cards.length;
  cards.forEach((card) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = card;
    btn.addEventListener("click", () => {
      ws.send(JSON.stringify({ type: "play_card", room_id: roomId, player_id: username, card_id: card }));
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
  updateUnoBtn();
}

function addCardToHand(cardId) {
  myCardCount++;
  const list = document.getElementById("player-cards");
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.textContent = cardId;
  btn.addEventListener("click", () => {
    ws.send(JSON.stringify({ type: "play_card", room_id: roomId, player_id: username, card_id: cardId }));
  });
  li.appendChild(btn);
  list.appendChild(li);
  updateUnoBtn();
}

function renderOpponents(players) {
  const list = document.getElementById("opponent-list");
  list.innerHTML = "";
  players.filter((p) => p.id !== username).forEach((p) => {
    const li = document.createElement("li");
    li.id = `opponent-${p.id}`;
    li.textContent = `${p.name} - ${p.card_count} carte(s)`;
    list.appendChild(li);
  });
}

const unoBtn = document.getElementById("uno-btn");
const counterUnoBtn = document.getElementById("counter-uno-btn");

function updateUnoBtn() {
  unoBtn.disabled = myCardCount !== 1;
}

function updateCounterUnoBtn() {
  const hasPending = Object.keys(pendingUno).some((id) => id !== username);
  counterUnoBtn.disabled = !hasPending;
}

unoBtn.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "uno", room_id: roomId, player_id: username }));
  unoBtn.disabled = true;
});

counterUnoBtn.addEventListener("click", () => {
  const target = Object.keys(pendingUno).find((id) => id !== username);
  if (!target) return;
  ws.send(JSON.stringify({ type: "counter_uno", room_id: roomId, player_id: username, target_id: target }));
  counterUnoBtn.disabled = true;
});

document.getElementById("draw-btn").addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "draw_card", room_id: roomId, player_id: username }));
});
