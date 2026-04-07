import { broadcast } from "../broadcast.js";

export function onLeaveRoom(message, socket, wss) {
  const { room_id, player_id } = message;
  broadcast(wss, room_id, { type: "player_left", room_id, player_id });
  socket.room_id = null;
}
