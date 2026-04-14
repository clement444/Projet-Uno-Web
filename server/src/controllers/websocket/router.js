import { handleEvent } from "./event_handler.js";
import { broadcast } from "./broadcast.js";
import { getRoomById } from "../api/room.js";

export function router(socket, wss) {
  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      socket.send(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    handleEvent(message, socket, wss);
  });

  socket.on("close", () => {
    if (socket.room_id) {
      const room = getRoomById(socket.room_id);
      if (room) {
        room.removePlayer(socket.id);
      }
      broadcast(wss, socket.room_id, {
        type: "player_disconnected",
        room_id: socket.room_id,
      });
    }
  });
}
