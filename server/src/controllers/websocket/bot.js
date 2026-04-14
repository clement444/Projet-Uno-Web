import { broadcast, sendToPlayer } from "./broadcast.js";
import { isBotPlayer } from "./gameManager.js";

export function playBotTurn(game, room_id, wss) {
  const bot_id = game.getCurrentPlayer();
  const hand = game.getHand(bot_id);
  const playable = hand.find((c) => game.isPlayable(c));

  if (playable) {
    playBotCard(game, room_id, wss, bot_id, playable);
  } else {
    game.drawCards(bot_id, 1);
    broadcast(wss, room_id, { type: "card_drawn", player_id: bot_id });
    game.nextTurn();
    broadcast(wss, room_id, { type: "turn", player_id: game.getCurrentPlayer() });
    triggerNextBotIfNeeded(game, room_id, wss);
  }
}

function triggerNextBotIfNeeded(game, room_id, wss) {
  if (isBotPlayer(room_id, game.getCurrentPlayer())) {
    setTimeout(() => playBotTurn(game, room_id, wss), 1500);
  }
}
