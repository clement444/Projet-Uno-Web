import { broadcast } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";

export function onJoinRoom(message, socket, wss) {
  const { room_id, player_id, name } = message;
  socket.room_id = room_id;
  const room = getRoomById(room_id);
  if (!room) {
    return socket.send(
      JSON.stringify({
        type: "room_not_found",
      }),
    );
  }

  socket.send(
    JSON.stringify({
      type: "room_players",
      players: room.getPlayers(),
    }),
  );

  broadcast(wss, room_id, {
    type: "player_joined",
    room_id,
    player_id,
    name,
    owner_id: room.owner_id,
  });
}
