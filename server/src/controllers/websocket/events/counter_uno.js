import { broadcast, sendToPlayer } from "../broadcast.js";
import { getGame } from "../gameManager.js";

export function onCounterUno(message, socket, wss) {
  const { target_id } = message;
  const room_id = socket.room_id;

  if (!room_id) {
    socket.send(JSON.stringify({ error: "Pas dans une room" }));
    return;
  }
  if (!target_id) {
    socket.send(JSON.stringify({ error: "target_id manquant" }));
    return;
  }

  const game = getGame(room_id);
  if (!game) {
    socket.send(JSON.stringify({ error: "Partie introuvable" }));
    return;
  }

  if (!game.unoPending.has(target_id)) {
    socket.send(JSON.stringify({ error: "Ce joueur a déjà dit UNO ou n'a pas 1 carte" }));
    return;
  }

  game.unoPending.delete(target_id);
  game.drawCards(target_id, 2);

  sendToPlayer(wss, target_id, {
    type: "hand_update",
    hand: game.getHand(target_id),
    opponents: game.getOpponentState(target_id),
  });
  broadcast(wss, room_id, { type: "counter_uno", target_id });
}
