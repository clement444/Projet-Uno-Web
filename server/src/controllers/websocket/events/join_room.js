import { broadcast } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";

export function onJoinRoom(message, socket, wss) {
  const { room_id } = message;
  const player_id = socket.user.id;
  const name = socket.user.username;

  const room = getRoomById(room_id);
  if (!room) {
    socket.send(JSON.stringify({ error: "Room introuvable" }));
    return;
  }

  if (room.getPlayers().length >= room.max_players) {
    socket.send(JSON.stringify({ error: "Room pleine" }));
    return;
  }

  room.addPlayer(player_id);
  socket.room_id = room_id;
  const updatedRoom = getRoomById(room_id);
  if (!updatedRoom) return;

  broadcast(wss, room_id, {
    type: "player_joined",
    room_id,
    player_id,
    name,
    owner_id: updatedRoom.owner_id,
  });
}
