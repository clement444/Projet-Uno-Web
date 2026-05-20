import db from "../../../utils/db.js";
import { broadcast_except_sender } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";
import { getGame } from "../../../structures/game/game_state.js";

export function onJoinRoom(message, socket, wss) {
  const room_id = message.room_id;
  socket.room_id = room_id;

  const room = getRoomById(room_id);
  if (!room)
    return socket.send(JSON.stringify({ type: "error", code: "room_not_found" }));

  try {
    room.addPlayer(socket.user_id);
  } catch (e) {
    let err = {};
    try { err = JSON.parse(e.message); } catch { /* pas du JSON */ }
    const code = err.status_code === 401 ? "room_full" : "internal_error";
    return socket.send(JSON.stringify({ type: "error", code }));
  }

  socket.send(JSON.stringify({
    type: "room_data",
    name: room.name,
    owner_id: room.owner_id,
    max_players: room.max_players,
    players: room.getPlayers(),
    bots: room.getBots(),
    is_started: room.is_started,
  }));

  // Reconnexion en cours de partie : renvoyer la main et l'état public
  const game = getGame(room_id);
  if (game) {
    socket.send(JSON.stringify({ type: "hand_update", cards: game.handOf(socket.user_id) }));
    socket.send(JSON.stringify({ type: "game_started", ...game.publicState() }));
  }

  const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(socket.user_id);
  broadcast_except_sender(wss, room_id, socket.user_id, {
    type: "player_joined",
    player_id: socket.user_id,
    name: user?.username ?? "Inconnu",
  });
}
