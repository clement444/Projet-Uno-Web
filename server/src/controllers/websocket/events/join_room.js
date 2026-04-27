import { broadcast_except_sender } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";
import { getUser } from "../../api/user.js";
import { getRoomBots } from "../../../structures/game/bot.js";

export async function onJoinRoom(message, socket, wss) {
  const room_id = message.room_id;
  socket.room_id = room_id;

  const room = getRoomById(room_id);
  if (!room) {
    return socket.send(
      JSON.stringify({
        type: "error",
        code: "room_not_found",
      }),
    );
  }

  const user = await getUser(socket.user_id);
  if (!user)
    return socket.send(
      JSON.stringify({
        type: "error",
        code: "invalid_token",
      }),
    );

  try {
    room.addPlayer(socket.user_id);
  } catch (e) {
    switch (e.message) {
      case "Room player limit exceeded":
        return socket.send(
          JSON.stringify({
            type: "error",
            code: "room_full",
          }),
        );
      default:
        return socket.send(
          JSON.stringify({
            type: "error",
            code: "internal_error",
          }),
        );
    }
  }

  console.log(room);

  socket.send(
    JSON.stringify({
      type: "room_data",
      name: room.name,
      owner_id: room.owner_id,
      max_players: room.max_players,
      players: room.getPlayers(),
      bots: room.getBots(),
      is_started: room.is_started,
    }),
  );

  broadcast_except_sender(wss, room_id, user.id, {
    type: "player_joined",
    player_id: user.id,
    name: user.username,
  });
}
