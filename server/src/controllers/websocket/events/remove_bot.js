import { broadcast } from "../broadcast.js";
import { removeBot } from "../../../structures/game/bot.js";
import db from "../../../utils/db.js";
import { getRoomById } from "../../api/room.js";

export function onRemoveBot(message, socket, wss) {
  const { bot_id } = message;

  const room = getRoomById(socket.room_id);
  if (!room) return;
  if (String(room.owner_id) !== String(socket.user_id)) return;

  room.removeBot(bot_id);

  broadcast(wss, room.id, {
    type: "bot_removed",
    bot_id: bot_id,
  });
}
