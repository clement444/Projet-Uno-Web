import { broadcast } from "../broadcast.js";
import { getRoomById, isPlayerInARoom } from "../../api/room.js";

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

  if (isPlayerInARoom(player_id)) {
    socket.send(JSON.stringify({ error: "Déjà dans une room" }));
    return;
  }

  room.addPlayer(player_id);
  socket.room_id = room_id;
  broadcast(wss, room_id, { type: "player_joined", room_id, player_id, name });
}
