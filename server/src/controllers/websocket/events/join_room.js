import { broadcast } from "../broadcast.js";
import db from "../../../utils/db.js";

export function onJoinRoom(message, socket, wss) {
  const { room_id, player_id, name } = message;
  socket.room_id = room_id;

  const existing = db
    .prepare(
      "SELECT u.username FROM room_players rp JOIN users u ON u.id = rp.user_id WHERE rp.room_id = ?",
    )
    .all(room_id);

  for (const p of existing) {
    if (p.username !== name) {
      socket.send(
        JSON.stringify({
          type: "player_joined",
          room_id,
          player_id: p.username,
          name: p.username,
        }),
      );
    }
  }

  broadcast(wss, room_id, { type: "player_joined", room_id, player_id, name });
}
