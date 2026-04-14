import { broadcast } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";
import { getGame } from "../gameManager.js";

export function onJoinRoom(message, socket, wss) {
  const room_id = parseInt(message.room_id);
  const player_id = socket.user.id;
  const name = socket.user.username;

  const room = getRoomById(room_id);
  if (!room) {
    socket.send(JSON.stringify({ error: "Room introuvable" }));
    return;
  }

  // Reconnexion depuis /game : le joueur est déjà dans la room, on renvoie l'état
  if (room.getPlayer(player_id)) {
    socket.room_id = room_id;
    const game = getGame(room_id);
    if (game) {
      socket.send(JSON.stringify({
        type: "game_started",
        room_id,
        top_card: game.getTopCard(),
        current_player_id: game.getCurrentPlayer(),
      }));
      socket.send(JSON.stringify({
        type: "hand_update",
        your_id: player_id,
        hand: game.getHand(player_id),
        opponents: game.getOpponentState(player_id),
      }));
    }
    return;
  }

  if (room.getPlayers().length >= room.max_players) {
    socket.send(JSON.stringify({ error: "Room pleine" }));
    return;
  }

  room.addPlayer(player_id);
  socket.room_id = room_id;
  const updatedRoom = getRoomById(room_id);
  if (!updatedRoom) return;

  broadcast(wss, room_id, {
    type: "player_joined",
    room_id,
    player_id,
    name,
    owner_id: updatedRoom.owner_id,
  });
}
