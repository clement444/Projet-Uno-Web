const token = localStorage.getItem("uno_token");
const username = localStorage.getItem("uno_username");

if (!token) window.location.href = "/";

document.getElementById("current-username").textContent = username;

let rooms = [];

async function loadRooms() {
  const res = await fetch("/api/room", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    localStorage.removeItem("uno_token");
    localStorage.removeItem("uno_username");
    window.location.href = "/";
    return;
  }
  rooms = await res.json();
  renderRooms();
  filterRooms();
}

function renderRooms() {
  const list = document.getElementById("rooms");
  list.innerHTML = "";
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.textContent = `${room.name} (${room.players}/${room.max_players})`;
    li.dataset.name = room.name;
    li.dataset.id = room.id;
    list.appendChild(li);
  });
}

const searchInput = document.getElementById("search-room");
const joinBtn = document.getElementById("join-room-btn");

function filterRooms() {
  const query = searchInput.value.trim().toLowerCase();
  const match = rooms.find((r) => r.name.toLowerCase() === query);
  joinBtn.disabled = !match;
  if (match) joinBtn.dataset.id = match.id;
}

searchInput.addEventListener("input", filterRooms);

document.getElementById("join-room-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const roomId = joinBtn.dataset.id;
  if (!roomId) return;
  localStorage.setItem("uno_room_id", roomId);
  localStorage.setItem("uno_is_host", "false");
  window.location.href = "/room";
});

document.getElementById("create-room-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("room-name").value;
  const msg = document.getElementById("create-room-msg");
  const res = await fetch("/api/room", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, max_players: 4 }),
  });
  const data = await res.json();
  if (!res.ok) {
    msg.textContent = data.error;
    msg.style.color = "red";
    msg.hidden = false;
    return;
  }
  msg.textContent = `Room "${name}" créée avec succès !`;
  msg.style.color = "green";
  msg.hidden = false;
  localStorage.setItem("uno_room_id", data.id);
  localStorage.setItem("uno_is_host", "true");
  setTimeout(() => { window.location.href = "/room"; }, 1000);
});

loadRooms();
