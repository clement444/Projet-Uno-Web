import { broadcast } from "../broadcast.js";
import { getGame } from "../../../structures/game/game_state.js";

export function onCounterUno(message, socket, wss) {
  const { room_id, target_id } = message;
  const user_id = socket.user?.id;

  const game = getGame(room_id);
  if (!game) return;

  const result = game.counterUno(user_id, target_id);
  if (result.error) { socket.send(JSON.stringify({ type: "counter_uno_error", error: result.error })); return; }

  // Main mise à jour pour la cible pénalisée
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && String(client.room_id) === String(room_id) && String(client.user?.id) === String(target_id)) {
      client.send(JSON.stringify({ type: "hand_update", cards: game.handOf(target_id) }));
    }
  });

  broadcast(wss, room_id, {
    type: "uno_claimed",
    caller_id: user_id,
    target_id,
    ...game.publicState(),
  });
}
