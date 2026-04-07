import { broadcast } from "../broadcast.js";

export function onPlayCard(message, socket, wss) {
  const { room_id, player_id, card_id } = message;
  broadcast(wss, room_id, { type: "card_played", room_id, player_id, card_id });
}
