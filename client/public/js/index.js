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
  if (!res.ok) return alert(data.error);
  localStorage.setItem("uno_token", data.token);
  localStorage.setItem("uno_username", username);
  window.location.href = "/lobby";
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;
  const confirm = document.getElementById("register-confirm").value;
  if (password !== confirm) return alert("Les mots de passe ne correspondent pas");
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error);
  localStorage.setItem("uno_token", data.token);
  localStorage.setItem("uno_username", username);
  window.location.href = "/lobby";
});
