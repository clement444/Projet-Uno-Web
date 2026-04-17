import { broadcast } from "../broadcast.js";
import { removeBot } from "../../../structures/game/bot.js";
import db from "../../../utils/db.js";
import { getRoomById } from "../../api/room.js";

export function onRemoveBot(message, socket, wss) {
  const { room_id, bot_id } = message;
  const user_id = socket.user_id;

  const room = getRoomById(room_id);
  if (!room) return;
  if (String(room.owner_id) !== String(user_id)) return;

  room.removeBot(bot_id);

  broadcast(wss, room_id, {
    type: "bot_removed",
    bot_id: bot_id,
  });
}
