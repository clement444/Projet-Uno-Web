import { broadcast } from "../broadcast.js";
import { getGame } from "../../../structures/game/game_state.js";
import { scheduleBotTurn } from "../../../structures/game/bot.js";

export function onDrawCard(message, socket, wss) {
  const user_id = socket.user_id;
  const room_id = socket.room_id;

  const game = getGame(room_id);
  if (!game)
    return socket.send(JSON.stringify({ type: "error", code: "game_not_found" }));

  const result = game.drawCard(user_id);
  if (result.error)
    return socket.send(JSON.stringify({ type: "draw_error", error: result.error }));

  // Cartes piochées + main complète au joueur qui vient de piocher
  socket.send(JSON.stringify({ type: "cards_drawn", cards: result.drawn, forced: result.forced }));
  socket.send(JSON.stringify({ type: "hand_update", cards: game.handOf(user_id) }));

  // État public broadcasté à toute la room (tour suivant, compteurs)
  broadcast(wss, room_id, {
    type: "player_drew",
    player_id: user_id,
    count: result.drawn.length,
    ...game.publicState(),
  });

  // Si le prochain joueur est un bot, déclencher son tour
  scheduleBotTurn(game, wss);
}
