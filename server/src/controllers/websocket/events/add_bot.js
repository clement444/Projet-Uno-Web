import { broadcast } from "../broadcast.js";
import { addBot, getRoomBots } from "../../../structures/game/bot.js";
import db from "../../../utils/db.js";

export function onAddBot(message, socket, wss) {
  const { room_id } = message;
  const user_id = socket.user?.id;

  // Vérifier que le joueur est le owner
  const room = db.prepare("SELECT owner_id, max_players FROM rooms WHERE id = ?").get(room_id);
  if (!room) { socket.send(JSON.stringify({ type: "error", error: "room_not_found" })); return; }
  if (String(room.owner_id) !== String(user_id)) { socket.send(JSON.stringify({ type: "error", error: "not_owner" })); return; }

  // Vérifier le nombre de joueurs + bots
  const playerCount = db.prepare("SELECT COUNT(*) AS count FROM room_players WHERE room_id = ?").get(room_id).count;
  const botCount = getRoomBots(room_id).length;

  if (playerCount + botCount >= room.max_players) {
    socket.send(JSON.stringify({ type: "error", error: "room_full" }));
    return;
  }

  const bot = addBot(room_id);

  broadcast(wss, room_id, {
    type: "bot_added",
    room_id,
    bot_id: bot.id,
    bot_name: bot.name,
  });
}
