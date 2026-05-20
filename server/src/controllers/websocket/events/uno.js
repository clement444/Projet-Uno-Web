import { broadcast } from "../broadcast.js";
import { getGame } from "../../../structures/game/game_state.js";

export function onUno(message, socket, wss) {
  const user_id = socket.user_id;
  const room_id = socket.room_id;

  const game = getGame(room_id);
  if (!game)
    return socket.send(JSON.stringify({ type: "error", code: "game_not_found" }));

  const result = game.callUno(user_id);
  if (result.error)
    return socket.send(JSON.stringify({ type: "uno_error", error: result.error }));

  broadcast(wss, room_id, { type: "uno_pending", player_id: user_id });
}
