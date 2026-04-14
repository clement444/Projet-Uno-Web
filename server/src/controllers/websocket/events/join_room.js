import { broadcast } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";
import { getGame } from "../gameManager.js";
import { verify_token } from "../../../utils/auth.js";
import db from "../../../utils/db.js";

export function onJoinRoom(message, socket, wss) {
  const { room_id: rawRoomId, token } = message;
  const room_id = parseInt(rawRoomId);

  // Auth via token dans le message
  if (!token) {
    socket.send(JSON.stringify({ error: "Token manquant dans join_room" }));
    return;
  }

  let user;
  try {
    const decoded = verify_token(token);
    user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(decoded.user_id);
    if (!user) {
      socket.send(JSON.stringify({ error: "Utilisateur introuvable" }));
      return;
    }
  } catch {
    socket.send(JSON.stringify({ error: "Token invalide ou expiré" }));
    return;
  }

  socket.user = user;
  const player_id = user.id;
  const name = user.username;

  const room = getRoomById(room_id);
  if (!room) {
    socket.send(JSON.stringify({ error: "Room introuvable" }));
    return;
  }

  socket.room_id = room_id;

  // Ajouter le joueur à la room (idempotent via INSERT OR IGNORE)
  room.addPlayer(player_id);

  // Envoyer les données de la room au joueur qui rejoint
  const players = db.prepare(
    "SELECT u.id, u.username FROM room_players rp JOIN users u ON u.id = rp.user_id WHERE rp.room_id = ?"
  ).all(room_id);

  socket.send(JSON.stringify({
    type: "room_data",
    owner_id: room.owner_id,
    players,
  }));

  // Si une partie est en cours, renvoyer l'état de jeu
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
    return;
  }

  // Informer les autres joueurs de la room (exclure l'expéditeur)
  broadcast(wss, room_id, { type: "player_joined", player_id, name }, socket);
}
