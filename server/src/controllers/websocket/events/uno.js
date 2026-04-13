import { broadcast } from "../broadcast.js";
import { getGame } from "../gameManager.js";

export function onUno(_message, socket, wss) {
  const room_id = socket.room_id;
  const player_id = socket.user.id;

  if (!room_id) {
    socket.send(JSON.stringify({ error: "Pas dans une room" }));
    return;
  }

  const game = getGame(room_id);
  if (!game) {
    socket.send(JSON.stringify({ error: "Partie introuvable" }));
    return;
  }

  if (!game.unoPending.has(player_id)) {
    socket.send(JSON.stringify({ error: "Tu n'as pas à déclarer UNO" }));
    return;
  }

  game.unoPending.delete(player_id);
  broadcast(wss, room_id, { type: "uno_declared", player_id });
}
