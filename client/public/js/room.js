const token = localStorage.getItem("uno_token");
const username = localStorage.getItem("uno_username");
const roomId = localStorage.getItem("uno_room_id");
const roomName = localStorage.getItem("uno_room_name");
const isHost = localStorage.getItem("uno_is_host") === "true";

if (!token || !roomId) window.location.href = "/";

document.getElementById("current-username").textContent = username;
document.getElementById("room-name").textContent = roomName || roomId;

const startBtn = document.getElementById("start-btn");
const waitingMsg = document.getElementById("waiting-msg");

const ws = new WebSocket(`ws://${location.host}`, ["Authorization", token]);

ws.addEventListener("open", () => {
  ws.send(
    JSON.stringify({
      type: "join_room",
      room_id: roomId,
      player_id: username,
      name: username,
    }),
  );
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "player_joined") addPlayer(msg.name, msg.player_id);
  if (msg.type === "player_left") removePlayer(msg.player_id);
  if (msg.type === "player_disconnected") removePlayer(msg.player_id);
  if (msg.type === "game_started") window.location.href = "/game";
});

function addPlayer(name, id) {
  const list = document.getElementById("players");
  if (document.getElementById(`player-${id}`)) return;

  const li = document.createElement("li");
  li.id = `player-${id}`;

  const isCurrentUser = name === username;
  const isPlayerHost = isCurrentUser && isHost;
  const initial = name.charAt(0).toUpperCase();

  li.innerHTML = `
    <div class="player-info">
      <div class="player-avatar">${initial}</div>
      <span class="player-name">${name}</span>
    </div>
    <div class="player-badges">
      ${isCurrentUser ? '<span class="badge badge-you">Vous</span>' : ""}
      ${isPlayerHost ? '<span class="badge badge-host">Hôte</span>' : ""}
    </div>
  `;

  list.appendChild(li);
  updatePlayerCount();
}

function removePlayer(id) {
  const el = document.getElementById(`player-${id}`);
  if (el) el.remove();
  updatePlayerCount();
}

function updatePlayerCount() {
  const count = document.getElementById("players").children.length;
  document.getElementById("player-count").textContent = `${count} / 4`;
}

function checkHost() {
  if (isHost) {
    startBtn.hidden = false;
    waitingMsg.hidden = true;
  } else {
    startBtn.hidden = true;
    waitingMsg.hidden = false;
  }
}

document.getElementById("leave-btn").addEventListener("click", async () => {
  await fetch(`/api/room?leave=${roomId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  ws.send(
    JSON.stringify({
      type: "leave_room",
      room_id: roomId,
      player_id: username,
    }),
  );
  localStorage.removeItem("uno_room_id");
  localStorage.removeItem("uno_room_name");
  window.location.href = "/lobby";
});

startBtn.addEventListener("click", () => {
  ws.send(
    JSON.stringify({
      type: "start_game",
      room_id: roomId,
      player_id: username,
    }),
  );
});

const standardColors = ["#F63A3A", "#565EF5", "#F5D55D", "#5DF55D"];
const specialCardColor = "#F8F9FA";

const svgLibrary = {
  0: "/public/assets/cards/0.svg",
  1: "/public/assets/cards/1.svg",
  2: "/public/assets/cards/2.svg",
  3: "/public/assets/cards/3.svg",
  4: "/public/assets/cards/4.svg",
  5: "/public/assets/cards/5.svg",
  6: "/public/assets/cards/6.svg",
  7: "/public/assets/cards/7.svg",
  8: "/public/assets/cards/8.svg",
  9: "/public/assets/cards/9.svg",
  colors: "/public/assets/cards/colors.svg",
  eye: "/public/assets/cards/eye.svg",
  block: "/public/assets/cards/block.svg",
  change_direction: "/public/assets/cards/change_direction.svg",
  deck: "/public/assets/cards/deck.svg",
  fire: "/public/assets/cards/fire.svg",
  shuffle: "/public/assets/cards/shuffle.svg",
  plus2: "/public/assets/cards/+2.svg",
  plus4: "/public/assets/cards/+4.svg",
};

const standardKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const specialKeys = [
  "colors",
  "eye",
  "block",
  "change_direction",
  "deck",
  "fire",
  "shuffle",
  "plus2",
  "plus4",
];

const bgContainer = document.getElementById("bg-container");
const numColumns = 16;
const cardsPerSet = 12;
const numSetsPerColumn = 8;
const svgCache = {};

async function loadSVG(url) {
  const res = await fetch(url);
  return await res.text();
}

async function preloadSVGs() {
  for (const [key, url] of Object.entries(svgLibrary)) {
    svgCache[key] = await loadSVG(url);
  }
}

function createColoredSVG(svgText, color) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = svgText.trim();
  const svg = wrapper.firstChild;
  const firstRect = svg.querySelector("rect");
  if (firstRect) firstRect.setAttribute("fill", color);
  return svg;
}

async function generateBackground() {
  await preloadSVGs();

  for (let i = 0; i < numColumns; i++) {
    const col = document.createElement("div");
    col.className = `column ${i % 2 === 0 ? "down" : "up"}`;

    const track = document.createElement("div");
    track.className = "card-track";
    track.style.animationDuration = `${50 + (i % 4) * 5}s`;

    const baseSequence = [];
    for (let c = 0; c < cardsPerSet; c++) {
      const isSpecial = Math.random() < 0.1;
      baseSequence.push(
        isSpecial
          ? {
              svgKey:
                specialKeys[Math.floor(Math.random() * specialKeys.length)],
              color: specialCardColor,
            }
          : {
              svgKey:
                standardKeys[Math.floor(Math.random() * standardKeys.length)],
              color:
                standardColors[
                  Math.floor(Math.random() * standardColors.length)
                ],
            },
      );
    }

    for (let s = 0; s < numSetsPerColumn; s++) {
      const setDiv = document.createElement("div");
      setDiv.className = "card-set";
      baseSequence.forEach((cardData) => {
        const card = document.createElement("div");
        card.className = "card";
        card.appendChild(
          createColoredSVG(svgCache[cardData.svgKey], cardData.color),
        );
        setDiv.appendChild(card);
      });
      track.appendChild(setDiv);
    }

    col.appendChild(track);
    bgContainer.appendChild(col);
  }
}

generateBackground();
