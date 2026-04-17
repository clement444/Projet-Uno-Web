import { broadcast } from "../broadcast.js";
import { addBot, getRoomBots } from "../../../structures/game/bot.js";
import db from "../../../utils/db.js";
import { getRoomById } from "../../api/room.js";

export function onAddBot(message, socket, wss) {
  const { room_id } = message;

  const room = getRoomById(room_id);
  if (!room)
    return socket.send(
      JSON.stringify({ type: "error", error: "room_not_found" }),
    );

  if (String(room.owner_id) !== String(socket.user_id))
    return socket.send(
      JSON.stringify({
        type: "error",
        code: "not_owner",
      }),
    );

  try {
    const bot = room.addBot();

    broadcast(wss, room_id, {
      type: "bot_added",
      room_id,
      bot_id: bot.id,
      bot_name: bot.name,
    });
  } catch (e) {
    socket.send(JSON.stringify({ type: "error", error: "room_full" }));
  }
}
