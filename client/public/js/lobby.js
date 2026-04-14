const token = localStorage.getItem("uno_token");
const username = localStorage.getItem("uno_username");

if (!token) window.location.href = "/";

document.getElementById("current-username").textContent = username;

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("uno_token");
  localStorage.removeItem("uno_username");
  localStorage.removeItem("uno_room_id");
  localStorage.removeItem("uno_is_host");
  window.location.href = "/";
});

let rooms = [];
let activePlayerFilter = "all";
let currentPage = 0;
const PAGE_SIZE = 10;

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
  document.getElementById("room-total").textContent = rooms.length;
  applyFilters();
}

const searchInput = document.getElementById("search-room");
const noRoomsMsg = document.getElementById("no-rooms-msg");
const list = document.getElementById("rooms");

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = rooms.filter((room) => {
    const matchName = room.name.toLowerCase().includes(query);
    const matchCount =
      activePlayerFilter === "all" ||
      room.player_count === parseInt(activePlayerFilter);
    return matchName && matchCount;
  });

  currentPage = 0;
  renderRooms(filtered);
}

function renderRooms(filtered) {
  list.innerHTML = "";

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const page = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  page.forEach((room) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="room-name">${room.name}</span>
      <span class="room-count">${room.player_count}/${room.max_players}</span>
    `;
    li.addEventListener("click", () => joinRoom(room.id, room.name));
    list.appendChild(li);
  });

  noRoomsMsg.hidden = filtered.length > 0;
  renderPagination(filtered, totalPages);
}

function renderPagination(filtered, totalPages) {
  const existing = document.getElementById("pagination");
  if (existing) existing.remove();
  if (totalPages <= 1) return;

  const nav = document.createElement("div");
  nav.id = "pagination";

  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.textContent = "←";
  previousButton.disabled = currentPage === 0;
  previousButton.addEventListener("click", () => {
    currentPage--;
    renderRooms(filtered);
  });

  const pageInfo = document.createElement("span");
  pageInfo.id = "page-info";
  pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = "→";
  nextButton.disabled = currentPage === totalPages - 1;
  nextButton.addEventListener("click", () => {
    currentPage++;
    renderRooms(filtered);
  });

  nav.appendChild(previousButton);
  nav.appendChild(pageInfo);
  nav.appendChild(nextButton);
  list.after(nav);
}

searchInput.addEventListener("input", applyFilters);

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activePlayerFilter = btn.dataset.count;
    applyFilters();
  });
});

async function joinRoom(roomId, roomName) {
  const room = await fetch(`/api/room?join=${roomId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }).then((res) => res.json());
  localStorage.setItem("uno_room_id", room.id);
  localStorage.setItem("uno_room_name", room.name);
  localStorage.setItem("uno_is_host", `${room.isPlayerHost}`);
  window.location.href = "/room";
}

document
  .getElementById("create-room-form")
  .addEventListener("submit", async (e) => {
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
      msg.textContent = data.message || data.error;
      msg.style.color = "#f87171";
      msg.hidden = false;
      return;
    }
    msg.textContent = `Salon "${name}" créé avec succès !`;
    msg.style.color = "#86efac";
    msg.hidden = false;
    localStorage.setItem("uno_room_id", data.id);
    localStorage.setItem("uno_room_name", name);
    localStorage.setItem("uno_is_host", "true");
    setTimeout(() => {
      window.location.href = "/room";
    }, 3000);
  });

function showMyRoom() {
  const storedRoomId = localStorage.getItem("uno_room_id");
  if (!storedRoomId) return;

  const myRoom = rooms.find((r) => r.id == storedRoomId);
  if (!myRoom) {
    localStorage.removeItem("uno_room_id");
    localStorage.removeItem("uno_room_name");
    localStorage.removeItem("uno_is_host");
    return;
  }

  document.getElementById("my-room-name").textContent = myRoom.name;
  document.getElementById("my-room-count").textContent = `${myRoom.player_count} / ${myRoom.max_players}`;
  document.getElementById("my-room-section").hidden = false;

  document.getElementById("my-room-btn").addEventListener("click", () => {
    localStorage.setItem("uno_room_id", myRoom.id);
    localStorage.setItem("uno_room_name", myRoom.name);
    localStorage.setItem("uno_is_host", "true");
    window.location.href = "/room";
  });
}

setInterval(() => {
  loadRooms().then(showMyRoom);
}, 5000);
loadRooms().then(showMyRoom);

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
