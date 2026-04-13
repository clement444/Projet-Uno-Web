import { broadcast } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";

export function onPlayCard(message, socket, wss) {
  const { card_id } = message;
  const room_id = socket.room_id;
  const player_id = socket.user.id;

  if (!room_id) {
    socket.send(JSON.stringify({ error: "Pas dans une room" }));
    return;
  }

  if (!card_id) {
    socket.send(JSON.stringify({ error: "card_id manquant" }));
    return;
  }

  const room = getRoomById(room_id);
  if (!room) {
    socket.send(JSON.stringify({ error: "Room introuvable" }));
    return;
  }

  if (!room.getPlayer(player_id)) {
    socket.send(JSON.stringify({ error: "Pas dans cette room" }));
    return;
  }

  broadcast(wss, room_id, { type: "card_played", room_id, player_id, card_id });
}
