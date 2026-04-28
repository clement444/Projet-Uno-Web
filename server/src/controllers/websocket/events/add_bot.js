import { broadcast } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";

export function onAddBot(message, socket, wss) {
  const room = getRoomById(socket.room_id);
  if (!room)
    return socket.send(JSON.stringify({ type: "error", code: "room_not_found" }));

  if (String(room.owner_id) !== String(socket.user_id))
    return socket.send(JSON.stringify({ type: "error", code: "not_owner" }));

  try {
    const bot = room.addBot();
    if (!bot)
      return socket.send(JSON.stringify({ type: "error", code: "bot_id_collision" }));

    broadcast(wss, room.id, {
      type: "bot_added",
      bot_id: bot.id,
      bot_name: bot.name,
    });
  } catch (e) {
    let err = {};
    try { err = JSON.parse(e.message); } catch { /* pas du JSON */ }
    const code = err.status_code === 401 ? "room_full" : "internal_error";
    socket.send(JSON.stringify({ type: "error", code }));
  }
}
