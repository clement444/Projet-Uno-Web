import { broadcast } from "../broadcast.js";
import { getGame } from "../../../structures/game/game_state.js";
import { scheduleBotTurn } from "../../../structures/game/bot.js";

export function onDrawCard(message, socket, wss) {
  const { room_id } = message;
  const user_id = socket.user?.id;

  const game = getGame(room_id);
  if (!game) { socket.send(JSON.stringify({ type: "error", error: "game_not_found" })); return; }

  const result = game.drawCard(user_id);
  if (result.error) { socket.send(JSON.stringify({ type: "draw_error", error: result.error })); return; }

  // Cartes piochées + main complète au joueur
  socket.send(JSON.stringify({ type: "cards_drawn", cards: result.drawn, forced: result.forced }));
  socket.send(JSON.stringify({ type: "hand_update", cards: game.handOf(user_id) }));

  // Broadcast état public (tour suivant, compteurs)
  broadcast(wss, room_id, {
    type: "player_drew",
    player_id: user_id,
    count: result.drawn.length,
    ...game.publicState(),
  });

  // Si le prochain joueur est un bot, le faire jouer
  scheduleBotTurn(game, wss);
}
