import { broadcast } from "../broadcast.js";
import { getGame, removeGame } from "../../../structures/game/game_state.js";
import { scheduleBotTurn } from "../../../structures/game/bot.js";
import { getRoomById } from "../../api/room.js";

export function onPlayCard(message, socket, wss) {
  const { card_index, chosen_color } = message;
  const user_id = socket.user_id;
  const room_id = socket.room_id;

  const game = getGame(room_id);
  if (!game)
    return socket.send(JSON.stringify({ type: "error", code: "game_not_found" }));

  const result = game.playCard(user_id, card_index, chosen_color);
  if (result.error)
    return socket.send(JSON.stringify({ type: "play_error", error: result.error }));

  // Main mise à jour pour le joueur qui vient de jouer
  socket.send(JSON.stringify({ type: "hand_update", cards: game.handOf(user_id) }));

  // État public broadcasté à toute la room
  broadcast(wss, room_id, {
    type: "card_played",
    player_id: user_id,
    card: result.card,
    effects: result.effects,
    ...game.publicState(),
  });

  if (result.winner) {
    broadcast(wss, room_id, { type: "game_over", winner_id: result.winner });
    const room = getRoomById(room_id);
    if (room) room.stopParty();
    removeGame(room_id);
    return;
  }

  // Si le prochain joueur est un bot, déclencher son tour
  scheduleBotTurn(game, wss);
}
