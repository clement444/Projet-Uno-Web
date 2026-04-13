import { broadcast, sendToPlayer } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";
import { getGame } from "../gameManager.js";

export function onDrawCard(_message, socket, wss) {
  const room_id = socket.room_id;
  const player_id = socket.user.id;

  if (!room_id) {
    socket.send(JSON.stringify({ error: "Pas dans une room" }));
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

  const drawn = game.drawCards(player_id, 1);
  if (drawn.length === 0) {
    socket.send(JSON.stringify({ error: "Plus de cartes dans la pioche" }));
    return;
  }

  sendToPlayer(wss, player_id, {
    type: "hand_update",
    hand: game.getHand(player_id),
    opponents: game.getOpponentState(player_id),
  });
  broadcast(wss, room_id, { type: "card_drawn", player_id });

  game.nextTurn();
  broadcast(wss, room_id, { type: "turn", player_id: game.getCurrentPlayer() });
}
