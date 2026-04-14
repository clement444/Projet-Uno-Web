import { broadcast } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";

export function onLeaveRoom(_message, socket, wss) {
  const room_id = socket.room_id;
  const player_id = socket.user.id;
  const name = socket.user.username;

  if (!room_id) {
    socket.send(JSON.stringify({ error: "Pas dans une room" }));
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

  room.removePlayer(player_id);
  socket.room_id = null;
  broadcast(wss, room_id, { type: "player_left", room_id, player_id, name });
}
