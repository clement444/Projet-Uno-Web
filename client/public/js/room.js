const token = localStorage.getItem("uno_token");
const username = localStorage.getItem("uno_username");
const roomId = localStorage.getItem("uno_room_id");

if (!token || !roomId) window.location.href = "/";

document.getElementById("room-name").textContent = roomId;

const ws = new WebSocket(`ws://${location.host}`);

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "join_room", room_id: roomId, player_id: username, name: username }));
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
  li.textContent = name;
  list.appendChild(li);
}

function removePlayer(id) {
  const el = document.getElementById(`player-${id}`);
  if (el) el.remove();
}

document.getElementById("leave-btn").addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "leave_room", room_id: roomId, player_id: username }));
  localStorage.removeItem("uno_room_id");
  window.location.href = "/lobby";
});

const startBtn = document.getElementById("start-btn");
const isHost = localStorage.getItem("uno_is_host") === "true";
if (isHost) startBtn.hidden = false;

startBtn.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "start_game", room_id: roomId, player_id: username }));
});
