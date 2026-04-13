import { broadcast } from "../broadcast.js";

export function onDrawCard(_message, socket, wss) {
  const room_id = socket.room_id;
  const player_id = socket.user.id;
  broadcast(wss, room_id, { type: "card_drawn", room_id, player_id });
}
