import { broadcast } from "../broadcast.js";
import { getGame } from "../../../structures/game/game_state.js";
import { scheduleBotTurn } from "../../../structures/game/bot.js";

export function onPlayCard(message, socket, wss) {
  const { room_id, card_index, chosen_color } = message;
  const user_id = socket.user?.id;

  const game = getGame(room_id);
  if (!game) { socket.send(JSON.stringify({ type: "error", error: "game_not_found" })); return; }

  const result = game.playCard(user_id, card_index, chosen_color);
  if (result.error) { socket.send(JSON.stringify({ type: "play_error", error: result.error })); return; }

  // Main mise à jour pour le joueur
  socket.send(JSON.stringify({ type: "hand_update", cards: game.handOf(user_id) }));

  // État public à tout le monde
  broadcast(wss, room_id, {
    type: "card_played",
    player_id: user_id,
    card: result.card,
    effects: result.effects,
    ...game.publicState(),
  });

  if (result.winner) {
    broadcast(wss, room_id, { type: "game_over", winner_id: result.winner });
    return;
  }

  // Si le prochain joueur est un bot, le faire jouer
  scheduleBotTurn(game, wss);
}
