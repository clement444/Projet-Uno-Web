// ══════════════════════════════════════════════════════════════════════════════
//  game.js — Client Uno
//  100 % compatible avec la logique serveur de Thomas :
//    • game_state.js (GameState en RAM, pendingDraw stackable, refill auto)
//    • bot.js        (IA avec priorité, IDs bot_X, noms aléatoires)
//    • websocket_server.js (auth via sec-websocket-protocol)
//    • events : join_room, game_started, hand_update, cards_drawn, card_played,
//               player_drew, uno_pending, uno_claimed, game_over, play_error…
// ══════════════════════════════════════════════════════════════════════════════

// ── Session ───────────────────────────────────────────────────────────────────

const token    = localStorage.getItem("uno_token");
const username = localStorage.getItem("uno_username");
const roomId   = localStorage.getItem("uno_room_id");

if (!token || !roomId) window.location.href = "/";

/**
 * Décode le payload d'un JWT (lecture seule, sans vérification de signature).
 * Permet de récupérer l'user_id sans appel réseau.
 */
function parseJwt(jwt) {
  try {
    const b64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

// ID numérique du joueur connecté (issu du payload JWT : { user_id: N })
const myId = parseJwt(token).user_id;

document.getElementById("current-player-name").textContent = username ?? "";

// ── Constantes ────────────────────────────────────────────────────────────────

/** card_id → chemin de l'asset SVG */
const CARD_SVG = {
  0:  "/public/assets/cards/0.svg",
  1:  "/public/assets/cards/1.svg",
  2:  "/public/assets/cards/2.svg",
  3:  "/public/assets/cards/3.svg",
  4:  "/public/assets/cards/4.svg",
  5:  "/public/assets/cards/5.svg",
  6:  "/public/assets/cards/6.svg",
  7:  "/public/assets/cards/7.svg",
  8:  "/public/assets/cards/8.svg",
  9:  "/public/assets/cards/9.svg",
  10: "/public/assets/cards/+2.svg",
  11: "/public/assets/cards/+4.svg",
  12: "/public/assets/cards/colors.svg",
  13: "/public/assets/cards/block.svg",
  14: "/public/assets/cards/change_direction.svg",
};

/** couleur (1-4) → hex (cohérent avec les data-color des boutons HTML) */
const COLOR_HEX = {
  1: "#e74c3c",   // Rouge
  2: "#f1c40f",   // Jaune
  3: "#2ecc71",   // Vert
  4: "#3498db",   // Bleu
};

// IDs des cartes "sauvages" qui exigent un choix de couleur
const WILD_IDS = new Set([11, 12]);

// ── Cache SVG ─────────────────────────────────────────────────────────────────

const svgCache = {};

async function loadSVG(url) {
  if (!svgCache[url]) {
    const res     = await fetch(url);
    svgCache[url] = await res.text();
  }
  return svgCache[url];
}

// Précharge tous les SVG en arrière-plan pour éviter les lags à l'affichage
Object.values(CARD_SVG).forEach(loadSVG);

/**
 * Crée un élément SVG coloré depuis le texte SVG brut.
 * Le premier <rect> de fond est recolorisé avec colorHex si fourni.
 */
function makeSVGEl(svgText, colorHex) {
  const wrap = document.createElement("div");
  wrap.innerHTML = svgText.trim();
  const svg = wrap.firstChild;
  if (!svg) return wrap;
  const rect = svg.querySelector("rect");
  if (rect && colorHex) rect.setAttribute("fill", colorHex);
  svg.style.width        = "100%";
  svg.style.height       = "100%";
  return svg;
}

// ── État local ────────────────────────────────────────────────────────────────

let myHand     = [];    // [{ card_id, color }, …]  — main du joueur connecté
let gameState  = null;  // dernier publicState reçu du serveur
let pendingUno = {};    // { String(player_id): true } — joueurs ayant dit UNO sans être contrés
let wildIndex  = null;  // index de la carte wild en attente d'un choix de couleur

/**
 * Caches de noms : peuplés via room_data, player_joined, bot_added.
 * Permet d'afficher les vrais noms dans les notifications et les adversaires.
 */
const playerNames = {};  // { String(user_id): username }
const botNames    = {};  // { String(bot_id):  bot_name  }

// ── Connexion WebSocket ───────────────────────────────────────────────────────
//
// Thomas utilise l'auth via sec-websocket-protocol :
//   côté serveur → protocols[1] est le token JWT
//   côté client  → new WebSocket(url, ["Authorization", token])

const ws = new WebSocket(`ws://${location.host}`, ["Authorization", token]);

ws.addEventListener("open", () => {
  // Rejoindre la room immédiatement après la connexion
  ws.send(JSON.stringify({ type: "join_room", room_id: parseInt(roomId) }));
});

ws.addEventListener("error", () => {
  toast("Erreur de connexion WebSocket.", "bad");
});

ws.addEventListener("close", (e) => {
  if (e.code !== 1000) {
    toast("Déconnecté du serveur — rechargez la page.", "bad");
  }
});

ws.addEventListener("message", (event) => {
  let msg;
  try { msg = JSON.parse(event.data); }
  catch { return; }
  handleMessage(msg);
});

// ── Dispatch des messages ─────────────────────────────────────────────────────

function handleMessage(msg) {
  switch (msg.type) {

    // ── Room / lobby ──────────────────────────────────────────────────────────

    case "room_data":
      onRoomData(msg);
      break;

    case "player_joined":
      // Mémoriser le nom du joueur pour les futures notifications
      if (msg.player_id && msg.name)
        playerNames[String(msg.player_id)] = msg.name;
      toast(`${msg.name ?? "Un joueur"} a rejoint la partie.`);
      break;

    case "player_left":
      toast(`${getName(msg.player_id)} a quitté la partie.`);
      break;

    case "player_disconnected":
      toast(`${getName(msg.player_id)} s'est déconnecté.`);
      break;

    case "bot_added":
      // Mémoriser le nom du bot pour l'affichage dans les adversaires
      if (msg.bot_id && msg.bot_name)
        botNames[String(msg.bot_id)] = msg.bot_name;
      toast(`${msg.bot_name ?? msg.bot_id} a été ajouté comme bot.`);
      break;

    case "bot_removed":
      toast(`${getName(msg.bot_id)} a été retiré.`);
      delete botNames[String(msg.bot_id)];
      break;

    // ── Jeu ───────────────────────────────────────────────────────────────────

    case "game_started":
      onGameStarted(msg);
      break;

    case "hand_update":
      // Main complète envoyée uniquement au joueur concerné
      myHand = msg.cards ?? [];
      renderHand();
      updateUnoBtn();
      break;

    case "cards_drawn":
      // Confirmation de pioche propre au joueur (nombre + type)
      onCardsDrawn(msg);
      break;

    case "card_played":
      // Carte jouée par n'importe quel joueur + publicState intégré
      onCardPlayed(msg);
      break;

    case "player_drew":
      // Quelqu'un a pioché + publicState intégré
      onPlayerDrew(msg);
      break;

    case "uno_pending":
      onUnoPending(msg);
      break;

    case "uno_claimed":
      // Counter-UNO réussi + publicState intégré
      onUnoClaimed(msg);
      break;

    case "game_over":
      showGameOver(msg.winner_id);
      break;

    // ── Erreurs ───────────────────────────────────────────────────────────────

    case "play_error":
    case "draw_error":
    case "uno_error":
    case "counter_uno_error":
      toast(friendlyError(msg.error), "bad");
      break;

    case "error":
      toast(friendlyError(msg.error ?? msg.code), "bad");
      break;

    default:
      console.debug("[WS] event non géré :", msg.type, msg);
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * Reçu à la connexion (et quand le host change).
 * Peuple les caches de noms depuis la liste des joueurs et des bots.
 */
function onRoomData(msg) {
  (msg.players ?? []).forEach((p) => {
    if (p.id && p.username) playerNames[String(p.id)] = p.username;
  });
  (msg.bots ?? []).forEach((b) => {
    if (b.id && b.name) botNames[String(b.id)] = b.name;
  });

  // Si la partie est déjà en cours, le joueur vient de se reconnecter.
  // L'état du jeu sera restauré dès réception de hand_update + card_played.
  if (msg.is_started) {
    toast("Reconnexion en cours de partie…");
  }
}

/**
 * La partie commence.
 * NOTE : dans la version actuelle de Thomas, start_game.js doit encore être
 * complété pour créer le GameState et envoyer hand_update + publicState.
 * Le client gère les deux cas (avec ou sans publicState dans le message).
 */
function onGameStarted(msg) {
  if (msg.current_player_id !== undefined) {
    applyPublicState(msg);
  }
  toast("La partie commence !", "good");
}

/**
 * Confirmation de pioche au joueur qui vient de piocher.
 * Affiche combien de cartes ont été piochées et si c'était forcé (+2/+4).
 */
function onCardsDrawn(msg) {
  const count = msg.cards?.length ?? 0;
  const label = msg.forced ? "pioche forcée" : "pioche volontaire";
  toast(`Vous piochez ${count} carte${count > 1 ? "s" : ""} (${label}).`);
}

/**
 * Une carte vient d'être jouée.
 * Affiche un toast selon l'effet, puis applique le publicState.
 */
function onCardPlayed(msg) {
  const effects    = msg.effects ?? [];
  const playerName = getName(msg.player_id);

  if (effects.includes("plus4")) {
    const pd = msg.pending_draw ?? 4;
    toast(`${playerName} pose un +4 — stack à ${pd} cartes !`, "bad");
  } else if (effects.includes("plus2")) {
    const pd = msg.pending_draw ?? 2;
    toast(`${playerName} pose un +2 — stack à ${pd} cartes !`, "bad");
  } else if (effects.includes("block")) {
    toast(`${playerName} bloque le prochain joueur !`);
  } else if (effects.includes("reverse")) {
    toast(`${playerName} inverse le sens !`);
  }

  applyPublicState(msg);
}

/** Quelqu'un a pioché (broadcast à tout le monde) + publicState. */
function onPlayerDrew(msg) {
  const count = msg.count ?? 1;
  if (String(msg.player_id) !== String(myId)) {
    toast(`${getName(msg.player_id)} pioche ${count} carte${count > 1 ? "s" : ""}.`);
  }
  applyPublicState(msg);
}

/** Un joueur a dit UNO — ouvre la fenêtre de contre pour les autres. */
function onUnoPending(msg) {
  pendingUno[String(msg.player_id)] = true;
  toast(`${getName(msg.player_id)} dit UNO !`, "good");
  updateCounterBtn();
}

/** Counter-UNO réussi — la cible pioche 2 cartes. */
function onUnoClaimed(msg) {
  delete pendingUno[String(msg.target_id)];
  if (String(msg.caller_id) !== String(myId)) {
    toast(
      `${getName(msg.caller_id)} contre l'UNO de ${getName(msg.target_id)} — +2 cartes !`,
      "bad",
    );
  }
  updateCounterBtn();
  applyPublicState(msg);
}

// ── publicState ───────────────────────────────────────────────────────────────

/**
 * Met à jour l'état local à partir d'un message contenant les champs
 * du publicState (peut être partiel — seuls les champs présents sont mis à jour).
 * Déclenche ensuite un re-rendu complet de l'UI.
 *
 * publicState() côté serveur (game_state.js) retourne :
 *   { current_player_id, color, last_card, direction, pending_draw, card_counts, winner }
 */
function applyPublicState(msg) {
  gameState = {
    current_player_id: msg.current_player_id ?? gameState?.current_player_id ?? null,
    color:             msg.color             ?? gameState?.color             ?? null,
    last_card:         msg.last_card         ?? gameState?.last_card         ?? null,
    direction:         msg.direction         ?? gameState?.direction         ?? 1,
    pending_draw:      msg.pending_draw      ?? gameState?.pending_draw      ?? 0,
    card_counts:       msg.card_counts       ?? gameState?.card_counts       ?? {},
    winner:            msg.winner            ?? gameState?.winner            ?? null,
  };

  // Fin de partie détectée dans le publicState
  if (gameState.winner) {
    showGameOver(gameState.winner);
    return;
  }

  render();
}

// ── Rendu complet ─────────────────────────────────────────────────────────────

/** Re-rendu complet de toute l'interface. Appelé après chaque publicState. */
function render() {
  renderTopCard();
  renderColorIndicator();
  renderOpponents(gameState?.card_counts ?? {});
  renderTurnBadge();
  renderDrawBtn();
  renderHand();
}

// ── Défausse ──────────────────────────────────────────────────────────────────

async function renderTopCard() {
  const el   = document.getElementById("current-card");
  const card = gameState?.last_card;

  el.innerHTML = "";

  if (!card) {
    el.innerHTML = `<span class="slot-label">Défausse</span>`;
    return;
  }

  const url = CARD_SVG[card.card_id];
  if (!url) return;

  const svgText  = await loadSVG(url);
  const colorHex = card.color ? COLOR_HEX[card.color] : null;
  el.appendChild(makeSVGEl(svgText, colorHex));
}

// ── Indicateur de couleur active ──────────────────────────────────────────────

function renderColorIndicator() {
  const el  = document.getElementById("color-indicator");
  const col = gameState?.color ?? null;
  el.style.background = col ? COLOR_HEX[col] : "#333";
  el.style.color      = col ? COLOR_HEX[col] : "transparent";
  el.classList.toggle("lit", !!col);
}

// ── Adversaires ───────────────────────────────────────────────────────────────

/**
 * @param {Object} counts  { String(player_id): cardCount }
 *   Les clés numériques sont automatiquement converties en strings par Object.entries.
 */
function renderOpponents(counts) {
  const list    = document.getElementById("opponent-list");
  const current = String(gameState?.current_player_id ?? "");
  list.innerHTML = "";

  Object.entries(counts).forEach(([pid, count]) => {
    if (String(pid) === String(myId)) return; // ne pas s'afficher soi-même

    const isActive = pid === current;
    const bot      = isBot(pid);
    const name     = getName(pid);
    const initial  = bot ? "B" : name.charAt(0).toUpperCase();

    const li = document.createElement("li");
    li.className = `opponent-card${isActive ? " active" : ""}`;
    li.innerHTML = `
      <div class="opponent-avatar${bot ? " bot-avatar" : ""}">${initial}</div>
      <span class="opponent-name">${name}</span>
      <span class="opponent-count">${count} carte${count > 1 ? "s" : ""}</span>
    `;
    list.appendChild(li);
  });
}

// ── Badge de tour ─────────────────────────────────────────────────────────────

function renderTurnBadge() {
  const el = document.getElementById("turn-badge");
  if (!gameState) {
    el.textContent = "En attente…";
    el.classList.remove("my-turn");
    return;
  }

  const isMyTurn = String(gameState.current_player_id) === String(myId);
  const name     = getName(gameState.current_player_id);
  const dir      = gameState.direction === -1 ? " ←" : " →";

  let text = isMyTurn
    ? `C'est votre tour !${dir}`
    : `Tour de ${name}${dir}`;

  if (gameState.pending_draw > 0) {
    text += `  •  +${gameState.pending_draw} en attente`;
  }

  el.textContent = text;
  el.classList.toggle("my-turn", isMyTurn);
}

// ── Bouton pioche ─────────────────────────────────────────────────────────────

function renderDrawBtn() {
  const btn  = document.getElementById("draw-btn");
  const span = btn.querySelector("span");

  const isMyTurn = gameState
    ? String(gameState.current_player_id) === String(myId)
    : false;

  btn.disabled = !isMyTurn;

  const pd = gameState?.pending_draw ?? 0;
  if (span) span.textContent = pd > 0 ? `Piocher (${pd})` : "Piocher";
}

// ── Main du joueur ────────────────────────────────────────────────────────────

async function renderHand() {
  const list     = document.getElementById("player-cards");
  const isMyTurn = gameState
    ? String(gameState.current_player_id) === String(myId)
    : false;

  list.innerHTML = "";

  for (let i = 0; i < myHand.length; i++) {
    const card     = myHand[i];
    const playable = isMyTurn && canPlay(card);

    const li  = document.createElement("li");
    const div = document.createElement("div");
    div.className = `hand-card noselect ${playable ? "playable" : "not-playable"}`;
    if (playable) div.title = "Jouer cette carte";

    const url = CARD_SVG[card.card_id];
    if (url) {
      const svgText  = await loadSVG(url);
      const colorHex = card.color ? COLOR_HEX[card.color] : null;
      div.appendChild(makeSVGEl(svgText, colorHex));
    }

    if (playable) {
      div.addEventListener("click", () => handlePlay(i, card));
    }

    li.appendChild(div);
    list.appendChild(li);
  }

  updateUnoBtn();
}

// ── Logique de jouabilité ─────────────────────────────────────────────────────
//
// Miroir exact de GameState.canPlay() dans game_state.js de Thomas :
//
//   if (isWild) {
//     if (pendingDraw > 0 && card_id !== PLUS4) return false;  // seul +4 peut contrer un stack
//     return true;
//   }
//   if (pendingDraw > 0)
//     return card_id === PLUS2 && lastCard.card_id === PLUS2;  // +2 stackable sur +2
//   return card.color === activeColor || card.card_id === lastCard.card_id;

function canPlay(card) {
  if (!gameState?.last_card) return false;

  const { last_card, color: activeColor, pending_draw } = gameState;
  const isWild = WILD_IDS.has(card.card_id);

  if (isWild) {
    // Le Joker (12) ne peut pas être joué si un stack +2/+4 est en cours
    if (pending_draw > 0 && card.card_id !== 11) return false;
    return true;
  }

  // Avec un stack actif, seul un +2 peut être empilé sur un +2
  if (pending_draw > 0) {
    return card.card_id === 10 && last_card.card_id === 10;
  }

  // Règle standard : même couleur active ou même valeur/type
  return card.color === activeColor || card.card_id === last_card.card_id;
}

// ── Interactions utilisateur ──────────────────────────────────────────────────

/** Déclenché au clic sur une carte jouable de la main. */
function handlePlay(index, card) {
  if (WILD_IDS.has(card.card_id)) {
    // Les cartes sauvages exigent un choix de couleur avant envoi
    wildIndex = index;
    showColorModal();
  } else {
    sendPlay(index, null);
  }
}

function sendPlay(index, chosenColor) {
  ws.send(JSON.stringify({
    type:         "play_card",
    room_id:      parseInt(roomId),
    card_index:   index,
    chosen_color: chosenColor,
  }));
}

// Piocher
document.getElementById("draw-btn").addEventListener("click", () => {
  ws.send(JSON.stringify({
    type:      "draw_card",
    room_id:   parseInt(roomId),
    player_id: myId,
  }));
});

// UNO (déclaration propre au joueur — protège sa dernière carte)
document.getElementById("uno-btn").addEventListener("click", () => {
  ws.send(JSON.stringify({
    type:      "uno",
    room_id:   parseInt(roomId),
    player_id: myId,
  }));
  document.getElementById("uno-btn").disabled = true;
});

// Counter-UNO (sanctionne le premier adversaire ayant dit UNO sans protection)
document.getElementById("counter-uno-btn").addEventListener("click", () => {
  const target = Object.keys(pendingUno).find(
    (pid) => String(pid) !== String(myId),
  );
  if (!target) return;

  ws.send(JSON.stringify({
    type:      "counter_uno",
    room_id:   parseInt(roomId),
    player_id: myId,
    target_id: target,
  }));
});

// ── Boutons UNO ───────────────────────────────────────────────────────────────

function updateUnoBtn() {
  document.getElementById("uno-btn").disabled = myHand.length !== 1;
}

function updateCounterBtn() {
  const hasTarget = Object.keys(pendingUno).some(
    (pid) => String(pid) !== String(myId),
  );
  document.getElementById("counter-uno-btn").disabled = !hasTarget;
}

// ── Modal choix de couleur ────────────────────────────────────────────────────

function showColorModal() {
  document.getElementById("color-modal").classList.remove("hidden");
}

function hideColorModal() {
  document.getElementById("color-modal").classList.add("hidden");
}

document.querySelectorAll(".color-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    hideColorModal();
    if (wildIndex !== null) {
      sendPlay(wildIndex, Number(btn.dataset.color));
      wildIndex = null;
    }
  });
});

// ── Modal fin de partie ───────────────────────────────────────────────────────

function showGameOver(winner_id) {
  const isWinner   = String(winner_id) === String(myId);
  const winnerName = getName(winner_id);

  document.getElementById("gameover-title").textContent = isWinner
    ? "🎉 Vous avez gagné !"
    : `${winnerName} a gagné !`;

  document.getElementById("gameover-sub").textContent = isWinner
    ? "Félicitations, vous avez remporté la partie !"
    : "Meilleure chance la prochaine fois !";

  document.getElementById("gameover-modal").classList.remove("hidden");

  if (isWinner) launchConfetti();
}

function launchConfetti() {
  const colors = ["#e74c3c", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#e67e22", "#ffffff"];
  for (let i = 0; i < 120; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    el.style.left             = (Math.random() * 100) + "vw";
    el.style.background       = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay   = (Math.random() * 2.5) + "s";
    el.style.animationDuration = (2 + Math.random() * 2.5) + "s";
    const size = (6 + Math.random() * 8) + "px";
    el.style.width        = size;
    el.style.height       = size;
    el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }
}

document.getElementById("back-lobby-btn").addEventListener("click", () => {
  window.location.href = "/lobby";
});

// ── Toasts ────────────────────────────────────────────────────────────────────

/**
 * @param {string} message   Texte à afficher
 * @param {"" | "good" | "bad"} type  Variante CSS
 */
function toast(message, type = "") {
  const container = document.getElementById("toast-container");
  const div       = document.createElement("div");
  div.className   = `toast${type ? ` toast-${type}` : ""}`;
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

/** Vérifie si un ID correspond à un bot (format : "bot_X"). */
function isBot(pid) {
  return String(pid).startsWith("bot_");
}

/**
 * Retourne le nom affiché d'un participant (humain ou bot).
 * Priorité : cache playerNames → cache botNames → fallback générique.
 */
function getName(pid) {
  if (pid === null || pid === undefined) return "?";
  const key = String(pid);
  if (playerNames[key]) return playerNames[key];
  if (botNames[key])    return botNames[key];
  if (isBot(key))       return `Bot ${key.replace("bot_", "")}`;
  if (key === String(myId)) return username ?? "Moi";
  return `Joueur ${pid}`;
}

/** Traduction des codes d'erreur serveur en messages lisibles. */
function friendlyError(code) {
  const MAP = {
    not_your_turn:       "Ce n'est pas votre tour.",
    cannot_play:         "Vous ne pouvez pas jouer cette carte.",
    color_required:      "Choisissez une couleur.",
    invalid_card:        "Carte invalide.",
    not_uno:             "Vous n'avez pas exactement 1 carte.",
    no_pending:          "Personne n'a dit UNO.",
    game_not_found:      "Partie introuvable.",
    game_over:           "La partie est déjà terminée.",
    not_owner:           "Seul le créateur peut effectuer cette action.",
    not_enough_player:   "Il faut au moins 2 joueurs pour démarrer.",
    room_full:           "Le salon est plein.",
    room_not_found:      "Salon introuvable.",
    invalid_token:       "Session invalide, reconnectez-vous.",
    internal_error:      "Erreur serveur interne.",
  };
  return MAP[code] ?? code ?? "Erreur inconnue.";
}

// ── Initialisation ────────────────────────────────────────────────────────────

// Les boutons d'action restent désactivés jusqu'à réception du premier publicState
// confirmant que c'est le tour du joueur.
document.getElementById("draw-btn").disabled        = true;
document.getElementById("uno-btn").disabled         = true;
document.getElementById("counter-uno-btn").disabled = true;
