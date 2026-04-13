import { broadcast } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";

export function onStartGame(_message, socket, wss) {
  const room_id = socket.room_id;

  if (!room_id) {
    socket.send(JSON.stringify({ error: "Pas dans une room" }));
    return;
  }

  const room = getRoomById(room_id);
  if (!room) {
    socket.send(JSON.stringify({ error: "Room introuvable" }));
    return;
  }

  broadcast(wss, room_id, { type: "game_started", room_id });
}
