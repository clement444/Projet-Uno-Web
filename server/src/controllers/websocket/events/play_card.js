import { broadcast, sendToPlayer } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";
import { getGame } from "../gameManager.js";

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

  if (game.getHand(player_id).length === 0) {
    broadcast(wss, room_id, { type: "game_over", winner_id: player_id });
    return;
  }

  game.nextTurn();
  broadcast(wss, room_id, { type: "turn", player_id: game.getCurrentPlayer() });
}
