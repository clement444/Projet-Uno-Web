const token = localStorage.getItem("uno_token");
const username = localStorage.getItem("uno_username");

const authSection = document.getElementById("auth-card");
const loggedInSection = document.getElementById("logged-in-section");

if (token && username) {
  authSection.hidden = true;
  loggedInSection.hidden = false;
  document.getElementById("logged-username").textContent = username;
}

document.getElementById("go-lobby-btn").addEventListener("click", () => {
  window.location.href = "/lobby";
});

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("uno_token");
  localStorage.removeItem("uno_username");
  localStorage.removeItem("uno_room_id");
  localStorage.removeItem("uno_is_host");
  window.location.reload();
});

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

tabLogin.addEventListener("click", () => {
  loginForm.hidden = false;
  registerForm.hidden = true;
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
});

tabRegister.addEventListener("click", () => {
  registerForm.hidden = false;
  loginForm.hidden = true;
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
});

function showMsg(id, text, isError) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.style.color = isError ? "red" : "green";
  el.hidden = false;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) return showMsg("login-msg", data.message, true);

  localStorage.setItem("uno_token", data.token);
  localStorage.setItem("uno_username", username);
  window.location.href = "/lobby";
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;
  const confirm = document.getElementById("register-confirm").value;

  if (password !== confirm)
    return showMsg(
      "register-msg",
      "Les mots de passe ne correspondent pas",
      true,
    );

  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) return showMsg("register-msg", data.error, true);

  showMsg("register-msg", "Compte créé avec succès !", false);

  localStorage.setItem("uno_token", data.token);
  localStorage.setItem("uno_username", username);

  setTimeout(() => {
    window.location.href = "/lobby";
  }, 1000);
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

const container = document.getElementById("bg-container");

const numColumns = 16;
const cardsPerSet = 12;
const numSetsPerColumn = 8;

const svgCache = {};

async function loadSVG(url) {
  const res = await fetch(url);
  return await res.text();
}

async function preloadSVGs() {
  const entries = Object.entries(svgLibrary);
  for (const [key, url] of entries) {
    svgCache[key] = await loadSVG(url);
  }
}

function createColoredSVG(svgText, color) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = svgText.trim();
  const svg = wrapper.firstChild;

  const firstRect = svg.querySelector("rect");
  if (firstRect) {
    firstRect.setAttribute("fill", color);
  }

  return svg;
}

async function generateBackground() {
  await preloadSVGs();

  for (let i = 0; i < numColumns; i++) {
    const col = document.createElement("div");
    col.className = `column ${i % 2 === 0 ? "down" : "up"}`;

    const track = document.createElement("div");
    track.className = "card-track";
    track.style.animationDuration = `${22 + (i % 4) * 2}s`;

    const baseSequence = [];
    for (let c = 0; c < cardsPerSet; c++) {
      const isSpecial = Math.random() < 0.1;

      if (isSpecial) {
        baseSequence.push({
          svgKey: specialKeys[Math.floor(Math.random() * specialKeys.length)],
          color: specialCardColor,
        });
      } else {
        baseSequence.push({
          svgKey: standardKeys[Math.floor(Math.random() * standardKeys.length)],
          color:
            standardColors[Math.floor(Math.random() * standardColors.length)],
        });
      }
    }

    for (let s = 0; s < numSetsPerColumn; s++) {
      const setDiv = document.createElement("div");
      setDiv.className = "card-set";

      baseSequence.forEach((cardData) => {
        const card = document.createElement("div");
        card.className = "card";

        const svg = createColoredSVG(svgCache[cardData.svgKey], cardData.color);
        card.appendChild(svg);

        setDiv.appendChild(card);
      });

      track.appendChild(setDiv);
    }

    col.appendChild(track);
    container.appendChild(col);
  }
}

generateBackground();
