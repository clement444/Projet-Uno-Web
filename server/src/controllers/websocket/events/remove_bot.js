import { broadcast } from "../broadcast.js";
import { removeBot } from "../../../structures/game/bot.js";
import db from "../../../utils/db.js";

export function onRemoveBot(message, socket, wss) {
  const { room_id, bot_id } = message;
  const user_id = socket.user?.id;

  // Vérifier que le joueur est le owner
  const room = db.prepare("SELECT owner_id FROM rooms WHERE id = ?").get(room_id);
  if (!room) return;
  if (String(room.owner_id) !== String(user_id)) return;

  const removed = removeBot(room_id, bot_id);
  if (!removed) return;

  broadcast(wss, room_id, {
    type: "bot_removed",
    room_id,
    bot_id: removed.id,
  });
}
