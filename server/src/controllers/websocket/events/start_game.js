import { broadcast, sendToPlayer } from "../broadcast.js";
import { getRoomById } from "../../api/room.js";
import { createGame } from "../gameManager.js";
import db from "../../../utils/db.js";

export function onStartGame(_message, socket, wss) {
  const room_id = socket.room_id;
  const player_id = socket.user.id;

  if (!room_id) {
    socket.send(JSON.stringify({ error: "Pas dans une room" }));
    return;
  }

  const room = getRoomById(room_id);
  if (!room) {
    socket.send(JSON.stringify({ error: "Room introuvable" }));
    return;
  }

  const row = db.prepare("SELECT owner_id FROM rooms WHERE id = ?").get(room_id);
  if (row.owner_id !== player_id) {
    socket.send(JSON.stringify({ error: "Seul le host peut lancer la partie" }));
    return;
  }

  const playerIds = room.getPlayers();
  if (playerIds.length < 2) {
    socket.send(JSON.stringify({ error: "Il faut au moins 2 joueurs" }));
    return;
  }

  const party = db.prepare("INSERT INTO parties (room_id) VALUES (?)").run(room_id);
  const party_id = party.lastInsertRowid;

  for (const uid of playerIds) {
    db.prepare("INSERT INTO party_players (party_id, user_id) VALUES (?, ?)").run(party_id, uid);
  }

  const game = createGame(room_id, party_id, playerIds);
  const topCard = game.getTopCard();

  broadcast(wss, room_id, {
    type: "game_started",
    room_id,
    top_card: topCard,
    current_player_id: game.getCurrentPlayer(),
  });

  for (const uid of playerIds) {
    sendToPlayer(wss, uid, {
      type: "hand_update",
      your_id: uid,
      hand: game.getHand(uid),
      opponents: game.getOpponentState(uid),
    });
  }
}
