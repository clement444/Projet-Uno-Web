import { broadcast } from "../broadcast.js";

export function onPlayCard(message, socket, wss) {
  const { card_id } = message;
  const room_id = socket.room_id;
  const player_id = socket.user.id;
  broadcast(wss, room_id, { type: "card_played", room_id, player_id, card_id });
}
