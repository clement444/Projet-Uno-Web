import { broadcast } from "../../controllers/websocket/broadcast.js";

// ── Bots par room ────────────────────────────────────────────────────────────
// Map<room_id, [{ id, name }]>
const roomBots = new Map();

let botCounter = 0;

export function addBot(room_id) {
  botCounter++;
  const bot = { id: `bot_${botCounter}`, name: `Bot ${botCounter}` };
  const bots = roomBots.get(String(room_id)) ?? [];
  bots.push(bot);
  roomBots.set(String(room_id), bots);
  return bot;
}

export function removeBot(room_id, bot_id) {
  const bots = roomBots.get(String(room_id)) ?? [];
  const idx = bots.findIndex((b) => b.id === bot_id);
  if (idx === -1) return null;
  const [removed] = bots.splice(idx, 1);
  roomBots.set(String(room_id), bots);
  return removed;
}

export function getRoomBots(room_id) {
  return roomBots.get(String(room_id)) ?? [];
}

export function clearRoomBots(room_id) {
  roomBots.delete(String(room_id));
}

export function isBot(player_id) {
  return String(player_id).startsWith("bot_");
}

// ── IA du bot ────────────────────────────────────────────────────────────────

const CARD_PLUS2   = 10;
const CARD_PLUS4   = 11;
const CARD_WILD    = 12;
const CARD_BLOCK   = 13;
const CARD_REVERSE = 14;
const COLORS       = [1, 2, 3, 4];

function scorePriority(card) {
  // Priorité : jouer les cartes spéciales en premier (plus de valeur stratégique)
  if (card.card_id === CARD_PLUS4)   return 100;
  if (card.card_id === CARD_PLUS2)   return 90;
  if (card.card_id === CARD_BLOCK)   return 80;
  if (card.card_id === CARD_REVERSE) return 70;
  if (card.card_id === CARD_WILD)    return 60;
  return card.card_id; // 0-9
}

function chooseBestCard(game, bot_id) {
  const hand = game.handOf(bot_id);
  const playable = [];

  for (let i = 0; i < hand.length; i++) {
    if (game.canPlay(hand[i])) {
      playable.push({ index: i, card: hand[i], priority: scorePriority(hand[i]) });
    }
  }

  if (playable.length === 0) return null;

  // Trier par priorité décroissante
  playable.sort((a, b) => b.priority - a.priority);
  return playable[0];
}

function chooseColor(hand) {
  // Compter les couleurs dans la main pour choisir la plus fréquente
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const card of hand) {
    if (card.color && counts[card.color] !== undefined) {
      counts[card.color]++;
    }
  }
  let best = 1;
  for (const c of COLORS) {
    if (counts[c] > counts[best]) best = c;
  }
  return best;
}

// ── Jouer le tour du bot (avec délai pour le rendre naturel) ─────────────────

export function scheduleBotTurn(game, wss) {
  if (game.winner) return;

  const current = game.currentPlayer;
  if (!isBot(current)) return;

  // Délai entre 800ms et 1500ms pour simuler la "réflexion"
  const delay = 800 + Math.floor(Math.random() * 700);

  setTimeout(() => {
    playBotTurn(game, current, wss);
  }, delay);
}

function playBotTurn(game, bot_id, wss) {
  if (game.winner) return;
  if (String(game.currentPlayer) !== String(bot_id)) return; // plus son tour

  const room_id = game.room_id;
  const best = chooseBestCard(game, bot_id);

  if (best) {
    // Choisir une couleur si c'est un wild
    const isWild = best.card.card_id === CARD_WILD || best.card.card_id === CARD_PLUS4;
    const chosen_color = isWild ? chooseColor(game.handOf(bot_id)) : null;

    const result = game.playCard(bot_id, best.index, chosen_color);
    if (result.error) {
      // Fallback : piocher
      doBotDraw(game, bot_id, wss);
      return;
    }

    // Broadcast la carte jouée
    broadcast(wss, room_id, {
      type: "card_played",
      player_id: bot_id,
      card: result.card,
      effects: result.effects,
      ...game.publicState(),
    });

    // UNO automatique
    if (game.handOf(bot_id).length === 1) {
      game.callUno(bot_id);
      broadcast(wss, room_id, { type: "uno_pending", player_id: bot_id });
    }

    if (result.winner) {
      broadcast(wss, room_id, { type: "game_over", winner_id: result.winner });
      return;
    }
  } else {
    // Aucune carte jouable → piocher
    doBotDraw(game, bot_id, wss);
  }

  // Tour suivant : si c'est encore un bot, enchaîner
  scheduleBotTurn(game, wss);
}

function doBotDraw(game, bot_id, wss) {
  const room_id = game.room_id;
  const result = game.drawCard(bot_id);
  if (result.error) return;

  broadcast(wss, room_id, {
    type: "player_drew",
    player_id: bot_id,
    count: result.drawn.length,
    ...game.publicState(),
  });

  // Envoyer hand_update aux vrais joueurs (pour mettre à jour les compteurs)
  // Les vrais joueurs reçoivent déjà le publicState via le broadcast ci-dessus
}
