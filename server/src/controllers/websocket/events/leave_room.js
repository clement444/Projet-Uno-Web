import { getRoomById } from "../../api/room.js";
import { broadcast, broadcast_except_sender } from "../broadcast.js";

export function onLeaveRoom(message, socket, wss) {
  const { room_id, player_id } = message;
  const room = getRoomById(room_id);
  if (!room) return;

  room.removePlayer(player_id);
  socket.room_id = null;

  broadcast(wss, room_id, {
    type: "player_left",
    player_id: socket.user_id,
  });

  const players = room.getPlayers();
  if (players.length === 1) {
    broadcast_except_sender(wss, room.id, socket.id, {
      type: "room_data",
      name: room.name,
      owner_id: room.owner_id,
      max_players: room.max_players,
      players: room.getPlayers(),
      bots: room.getBots(),
    });
  }
}
