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

function playBotCard(game, room_id, wss, bot_id, card) {
  const isWild = [11, 12].includes(card.card_id);
  const color = isWild ? (Math.floor(Math.random() * 4) + 1) : null;

  game.playCard(bot_id, card.card_id, color);
  broadcast(wss, room_id, {
    type: "card_played",
    player_id: bot_id,
    card_id: card.card_id,
    color: isWild ? color : card.color,
  });

  const remaining = game.getHand(bot_id);
  if (remaining.length === 0) {
    broadcast(wss, room_id, { type: "game_over", winner_id: bot_id });
    return;
  }

  let skip = false;
  const nextIdx = (game.currentIndex + game.direction + game.players.length) % game.players.length;
  const nextId = game.players[nextIdx];

  if (card.card_id === 14) {
    game.reverse();
    broadcast(wss, room_id, { type: "direction_changed", direction: game.direction });
  } else if (card.card_id === 13) {
    skip = true;
    broadcast(wss, room_id, { type: "player_skipped", player_id: nextId });
  } else if (card.card_id === 10) {
    skip = true;
    game.drawCards(nextId, 2);
    sendToPlayer(wss, nextId, { type: "hand_update", hand: game.getHand(nextId), opponents: game.getOpponentState(nextId) });
    broadcast(wss, room_id, { type: "draw_forced", player_id: nextId, count: 2 });
  } else if (card.card_id === 11) {
    skip = true;
    game.drawCards(nextId, 4);
    sendToPlayer(wss, nextId, { type: "hand_update", hand: game.getHand(nextId), opponents: game.getOpponentState(nextId) });
    broadcast(wss, room_id, { type: "draw_forced", player_id: nextId, count: 4 });
  }

  game.nextTurn(skip);
  broadcast(wss, room_id, { type: "turn", player_id: game.getCurrentPlayer() });
  triggerNextBotIfNeeded(game, room_id, wss);
}

function triggerNextBotIfNeeded(game, room_id, wss) {
  if (isBotPlayer(room_id, game.getCurrentPlayer())) {
    setTimeout(() => playBotTurn(game, room_id, wss), 1500);
  }
}
