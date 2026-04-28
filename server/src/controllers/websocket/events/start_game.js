import { broadcast } from "../broadcast.js";
import { GameState } from "../../../structures/game/game_state.js";
import { scheduleBotTurn } from "../../../structures/game/bot.js";
import { getRoomById } from "../../api/room.js";

export function onStartGame(message, socket, wss) {
  const room = getRoomById(socket.room_id);
  if (!room)
    return socket.send(JSON.stringify({ type: "error", code: "room_not_found" }));

  if (String(room.owner_id) !== String(socket.user_id))
    return socket.send(JSON.stringify({ type: "error", code: "not_owner" }));

  const participants = room.getParticipants();
  if (participants.length <= 1)
    return socket.send(JSON.stringify({ type: "error", code: "not_enough_player" }));

  room.startParty();

  const playerIds = participants.map((p) => p.id);
  const game = new GameState(room.id, playerIds);

  // Envoyer la main initiale à chaque joueur humain connecté dans la room
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && String(client.room_id) === String(room.id)) {
      client.send(JSON.stringify({ type: "hand_update", cards: game.handOf(client.user_id) }));
    }
  });

  broadcast(wss, room.id, {
    type: "game_started",
    ...game.publicState(),
  });

  // Si le premier joueur est un bot, déclencher son tour
  scheduleBotTurn(game, wss);
}
