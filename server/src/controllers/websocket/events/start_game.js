import { broadcast } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";
import db from "../../../utils/db.js";

export function onStartGame(_message, socket, wss) {
  const room_id = socket.room_id;
  const player_id = socket.user.id;

  if (!room_id) {
    socket.send(JSON.stringify({ error: "Pas dans une room" }));
    return;
  }

  const room = getRoomById(room_id);
  if (!room) {
    socket.send(JSON.stringify({ error: "Room introuvable" }));
    return;
  }

  const row = db.prepare("SELECT owner_id FROM rooms WHERE id = ?").get(room_id);
  if (row.owner_id !== player_id) {
    socket.send(JSON.stringify({ error: "Seul le host peut lancer la partie" }));
    return;
  }

  broadcast(wss, room_id, { type: "game_started", room_id });
}
