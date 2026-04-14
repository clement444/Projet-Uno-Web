import { handleEvent } from "./event_handler.js";
import { broadcast } from "./broadcast.js";
import { getGame } from "./gameManager.js";
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
    if (!socket.room_id || !socket.user) return;

    const game = getGame(socket.room_id);

    if (game) {
      // Partie en cours : ne pas toucher à la room ni au jeu.
      // Le joueur est en transition room→game ou va se reconnecter.
      broadcast(wss, socket.room_id, {
        type: "player_disconnected",
        player_id: socket.user.id,
      });
      return;
    }

    // Pas de partie active : nettoyage normal de la room.
    const room = getRoomById(socket.room_id);
    if (room) room.removePlayer(socket.user.id);
    broadcast(wss, socket.room_id, {
      type: "player_disconnected",
      player_id: socket.user.id,
    });
  });
}
