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
let topCard = null;
const pendingUno = {};
const playerNames = {};

const unoBtn = document.getElementById("uno-btn");
const counterUnoBtn = document.getElementById("counter-uno-btn");

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "join_room", room_id: parseInt(roomId), token }));
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "game_started") {
    topCard = msg.top_card;
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
    topCard = { id: msg.card_id, color: msg.color };
    renderTopCard(topCard);
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
    const won = msg.winner_id === myId;
    const name = playerNames[msg.winner_id] ?? `Joueur ${msg.winner_id}`;
    showGameResult(won, name);
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
    if (!isMyTurn) {
      btn.disabled = true;
      btn.classList.remove("card-playable");
    } else {
      const card = { card_id: parseInt(btn.dataset.cardId), color: parseInt(btn.dataset.color) };
      const playable = isCardPlayable(card);
      btn.disabled = !playable;
      btn.classList.toggle("card-playable", playable);
    }
  });
  refreshDrawHighlight();
}

function isCardPlayable(card) {
  if (!topCard) return false;
  if ([11, 12].includes(card.card_id)) return true;
  return card.color === topCard.color || card.card_id === topCard.id;
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
    const playable = isMyTurn && isCardPlayable(card);
    btn.disabled = !isMyTurn || !playable;
    btn.dataset.cardId = card.card_id;
    btn.dataset.color = card.color;
    btn.dataset.rowId = card.id;
    btn.classList.toggle("card-playable", playable);
    const img = document.createElement("img");
    img.src = `/public/assets/cards/${CARD_ASSETS[card.card_id]}.svg`;
    img.alt = CARD_ASSETS[card.card_id];
    btn.appendChild(img);
    btn.addEventListener("click", async () => {
      const payload = { type: "play_card", card_id: card.card_id, row_id: card.id };
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
  refreshDrawHighlight();
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

function refreshDrawHighlight() {
  const noPlayable = isMyTurn &&
    !Array.from(document.querySelectorAll("#player-cards button")).some((b) => !b.disabled);
  document.getElementById("draw-btn").classList.toggle("draw-highlight", noPlayable);
  document.getElementById("no-card-hint").hidden = !noPlayable;
}

function updateDirectionIndicator(direction) {
  const el = document.getElementById("direction-indicator");
  el.textContent = direction === 1 ? "Sens : →" : "Sens : ←";
}

function showGameResult(won, winnerName) {
  const overlay = document.getElementById("game-result-overlay");
  const canvas  = document.getElementById("result-canvas");
  const icon     = document.getElementById("result-icon");
  const title    = document.getElementById("result-title");
  const subtitle = document.getElementById("result-subtitle");

  overlay.style.background = won ? "rgba(0,0,0,0.78)" : "rgba(8,0,0,0.92)";
  icon.textContent     = won ? "🏆" : "💀";
  title.textContent    = won ? "Victoire !" : "Défaite";
  title.style.color    = won ? "#FFD700" : "#cc2222";
  title.style.animation = won ? "title-shine 2s ease-in-out infinite" : "title-flicker 5s 0.8s infinite";
  subtitle.textContent = won
    ? "Bravo, tu as remporté la partie !"
    : `Bien joué à ${winnerName} — meilleure chance la prochaine fois !`;

  overlay.hidden = false;

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const stop = won ? startConfetti(canvas) : startAsh(canvas);

  document.getElementById("result-home-btn").addEventListener("click", () => {
    stop();
    window.location.href = "/";
  }, { once: true });

  setTimeout(() => { stop(); window.location.href = "/"; }, 8000);
}

function startConfetti(canvas) {
  const ctx = canvas.getContext("2d");
  const COLORS = ["#F63A3A","#565EF5","#5DF55D","#F5D55D","#FF9500","#FF69B4","#00CFFF","#FFFFFF"];

  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: Math.random() * 14 + 5,
    h: Math.random() * 7 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.18,
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 3 + 2,
    shape: Math.random() > 0.4 ? "rect" : "circle",
  }));

  const bursts = [];
  const burstTimer = setInterval(() => {
    const bx = canvas.width  * 0.1 + Math.random() * canvas.width  * 0.8;
    const by = canvas.height * 0.1 + Math.random() * canvas.height * 0.45;
    const bc = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const spd   = Math.random() * 7 + 3;
      bursts.push({
        x: bx, y: by,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: bc,
        size: Math.random() * 5 + 2,
        life: 1,
        decay: 0.016 + Math.random() * 0.012,
      });
    }
  }, 1400);

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
      if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "circle") {
        ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.x  += b.vx; b.y += b.vy;
      b.vy += 0.15; b.vx *= 0.97;
      b.life -= b.decay;
      if (b.life <= 0) { bursts.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = b.life;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.size * b.life, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    frame = requestAnimationFrame(draw);
  }
  draw();

  return () => { clearInterval(burstTimer); cancelAnimationFrame(frame); };
}

function startAsh(canvas) {
  const ctx = canvas.getContext("2d");
  const COLORS = ["#3a1010","#4a0808","#2a0000","#550000","#1a1a1a","#662200"];

  const embers = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    w: Math.random() * 3 + 1,
    h: Math.random() * 22 + 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: -Math.PI / 6 + (Math.random() - 0.5) * 0.4,
    vx: -0.6 + (Math.random() - 0.5) * 0.4,
    vy: Math.random() * 3 + 1.5,
    opacity: Math.random() * 0.45 + 0.15,
  }));

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of embers) {
      p.x += p.vx; p.y += p.vy;
      if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frame = requestAnimationFrame(draw);
  }
  draw();

  return () => cancelAnimationFrame(frame);
}
