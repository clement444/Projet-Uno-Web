import { broadcast } from "../broadcast.js";

export function onLeaveRoom(_message, socket, wss) {
  const room_id = socket.room_id;
  const player_id = socket.user.id;
  const name = socket.user.username;
  broadcast(wss, room_id, { type: "player_left", room_id, player_id, name });
  socket.room_id = null;
}
