import { broadcast, sendToPlayer } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";
import { getGame, isBotPlayer } from "../gameManager.js";
import { playBotTurn } from "../bot.js";

export function onPlayCard(message, socket, wss) {
  const { card_id, color } = message;
  const room_id = socket.room_id;
  const player_id = socket.user.id;

  if (!room_id) {
    socket.send(JSON.stringify({ error: "Pas dans une room" }));
    return;
  }
  if (card_id === undefined) {
    socket.send(JSON.stringify({ error: "card_id manquant" }));
    return;
  }

  const room = getRoomById(room_id);
  if (!room) {
    socket.send(JSON.stringify({ error: "Room introuvable" }));
    return;
  }

  const game = getGame(room_id);
  if (!game) {
    socket.send(JSON.stringify({ error: "Partie introuvable" }));
    return;
  }

  if (game.getCurrentPlayer() !== player_id) {
    socket.send(JSON.stringify({ error: "Ce n'est pas ton tour" }));
    return;
  }

  const hand = game.getHand(player_id);
  const cardRow = hand.find((c) => c.card_id === card_id);
  if (!cardRow) {
    socket.send(JSON.stringify({ error: "Carte introuvable dans ta main" }));
    return;
  }

  if (!game.isPlayable(cardRow)) {
    socket.send(JSON.stringify({ error: "Carte non jouable" }));
    return;
  }

  const isWild = [11, 12].includes(card_id);
  if (isWild && !color) {
    socket.send(JSON.stringify({ error: "Couleur requise pour cette carte" }));
    return;
  }

  const played = game.playCard(player_id, card_id, isWild ? color : null);
  if (!played) {
    socket.send(JSON.stringify({ error: "Erreur lors du jeu de la carte" }));
    return;
  }

  broadcast(wss, room_id, {
    type: "card_played",
    player_id,
    card_id,
    color: isWild ? color : played.color,
  });

  sendToPlayer(wss, player_id, {
    type: "hand_update",
    hand: game.getHand(player_id),
    opponents: game.getOpponentState(player_id),
  });

  const remaining = game.getHand(player_id);
  if (remaining.length === 0) {
    broadcast(wss, room_id, { type: "game_over", winner_id: player_id });
    return;
  }
  if (remaining.length === 1) {
    game.unoPending.add(player_id);
  }

  let skip = false;
  const nextIdx = (game.currentIndex + game.direction + game.players.length) % game.players.length;
  const nextId = game.players[nextIdx];

  if (card_id === 14) {
    game.reverse();
    broadcast(wss, room_id, { type: "direction_changed", direction: game.direction });
  } else if (card_id === 13) {
    skip = true;
    broadcast(wss, room_id, { type: "player_skipped", player_id: nextId });
  } else if (card_id === 10) {
    skip = true;
    game.drawCards(nextId, 2);
    sendToPlayer(wss, nextId, { type: "hand_update", hand: game.getHand(nextId), opponents: game.getOpponentState(nextId) });
    broadcast(wss, room_id, { type: "draw_forced", player_id: nextId, count: 2 });
  } else if (card_id === 11) {
    skip = true;
    game.drawCards(nextId, 4);
    sendToPlayer(wss, nextId, { type: "hand_update", hand: game.getHand(nextId), opponents: game.getOpponentState(nextId) });
    broadcast(wss, room_id, { type: "draw_forced", player_id: nextId, count: 4 });
  }

  game.nextTurn(skip);
  broadcast(wss, room_id, { type: "turn", player_id: game.getCurrentPlayer() });
  if (isBotPlayer(room_id, game.getCurrentPlayer())) {
    setTimeout(() => playBotTurn(game, room_id, wss), 1500);
  }
}
