import { getRoomById } from "../../api/room.js";
import { broadcast } from "../broadcast.js";
import { getGame, removeGame } from "../../../structures/game/game_state.js";

export function onLeaveRoom(message, socket, wss) {
  const room_id = socket.room_id;
  const room = getRoomById(room_id);
  if (!room) return;

  const hasHostLeaved = String(room.owner_id) === String(socket.user_id);

  // Stopper le jeu actif si la partie était en cours
  const game = getGame(room_id);
  if (game) {
    game.winner = "__terminated__";
    removeGame(room_id);
  }

  room.removePlayer(socket.user_id);
  socket.room_id = null;

  broadcast(wss, room_id, {
    type: "player_left",
    player_id: socket.user_id,
  });

  // Si l'hôte a quitté et la room existe encore, envoyer le nouvel état
  if (hasHostLeaved && getRoomById(room_id)) {
    broadcast(wss, room_id, {
      type: "room_data",
      name: room.name,
      owner_id: room.owner_id,
      max_players: room.max_players,
      players: room.getPlayers(),
      bots: room.getBots(),
    });
  }
}
