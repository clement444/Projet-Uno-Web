const token = localStorage.getItem("uno_token");
const username = localStorage.getItem("uno_username");

const authSection = document.getElementById("auth-section");
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
});

tabRegister.addEventListener("click", () => {
  registerForm.hidden = false;
  loginForm.hidden = true;
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
  if (!res.ok) return showMsg("login-msg", data.error, true);
  localStorage.setItem("uno_token", data.token);
  localStorage.setItem("uno_username", username);
  window.location.href = "/lobby";
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;
  const confirm = document.getElementById("register-confirm").value;
  if (password !== confirm) return showMsg("register-msg", "Les mots de passe ne correspondent pas", true);
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
  setTimeout(() => { window.location.href = "/lobby"; }, 1000);
});
