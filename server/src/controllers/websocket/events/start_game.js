import { broadcast } from "../broadcast.js";
import { GameState } from "../../../structures/game/game_state.js";
import {
  getRoomBots,
  isBot,
  scheduleBotTurn,
} from "../../../structures/game/bot.js";
import db from "../../../utils/db.js";
import { getRoomById } from "../../api/room.js";

export function onStartGame(message, socket, wss) {
  const room = getRoomById(socket.room_id);
  if (!room)
    return socket.send(
      JSON.stringify({ type: "error", code: "room_not_found" }),
    );

  if (String(room.owner_id) !== String(socket.user_id))
    return socket.send(
      JSON.stringify({
        type: "error",
        code: "not_owner",
      }),
    );

  if (room.getParticipants().length <= 1) {
    return socket.send(
      JSON.stringify({
        type: "error",
        code: "not_enough_player",
      }),
    );
  }

  room.startParty();
  broadcast(wss, room.id, {
    type: "game_started",
  });
}
