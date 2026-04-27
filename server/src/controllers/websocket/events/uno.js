import { broadcast } from "../broadcast.js";
import { getGame } from "../../../structures/game/game_state.js";

export function onUno(message, socket, wss) {
  const { room_id } = message;
  const user_id = socket.user?.id;

  const game = getGame(room_id);
  if (!game) return;

  const result = game.callUno(user_id);
  if (result.error) { socket.send(JSON.stringify({ type: "uno_error", error: result.error })); return; }

  broadcast(wss, room_id, { type: "uno_pending", player_id: user_id });
}
