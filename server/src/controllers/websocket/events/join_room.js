import { broadcast } from "../broadcast.js";

export function onJoinRoom(message, socket, wss) {
  const { room_id } = message;
  const player_id = socket.user.id;
  const name = socket.user.username;
  socket.room_id = room_id;
  broadcast(wss, room_id, { type: "player_joined", room_id, player_id, name });
}
