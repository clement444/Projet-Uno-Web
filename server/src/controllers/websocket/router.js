import { handleEvent } from "./event_handler.js";
import { broadcast } from "./broadcast.js";
import { getGame } from "./gameManager.js";
import db from "../../utils/db.js";

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
    if (!socket.room_id || !socket.user) return;

    db.prepare("DELETE FROM room_players WHERE room_id = ? AND user_id = ?")
      .run(socket.room_id, socket.user.id);

    broadcast(wss, socket.room_id, {
      type: "player_disconnected",
      room_id: socket.room_id,
      player_id: socket.user.id,
    });

    const game = getGame(socket.room_id);
    if (!game) return;

    const result = game.removePlayer(socket.user.id);
    if (!result) return;

    if (result.gameOver) {
      broadcast(wss, socket.room_id, { type: "game_over", winner_id: result.winner_id });
    } else {
      broadcast(wss, socket.room_id, { type: "turn", player_id: result.nextPlayer });
    }
  });
}
