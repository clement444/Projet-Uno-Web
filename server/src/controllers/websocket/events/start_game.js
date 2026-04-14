import { broadcast } from "../broadcast.js";
import { GameState } from "../../../structures/game/game_state.js";
import db from "../../../utils/db.js";

export function onStartGame(message, socket, wss) {
  const { room_id } = message;
  const user_id = socket.user?.id;

  const room = db.prepare("SELECT owner_id FROM rooms WHERE id = ?").get(room_id);
  if (!room) { socket.send(JSON.stringify({ type: "error", error: "room_not_found" })); return; }
  if (String(room.owner_id) !== String(user_id)) { socket.send(JSON.stringify({ type: "error", error: "not_owner" })); return; }

  const rows = db
    .prepare("SELECT user_id FROM room_players WHERE room_id = ? ORDER BY joined_at ASC")
    .all(room_id);

  if (rows.length < 1) { socket.send(JSON.stringify({ type: "error", error: "not_enough_players" })); return; }

  const player_ids = rows.map((r) => r.user_id);
  const game = new GameState(room_id, player_ids);

  // Persister la partie
  const { lastInsertRowid: party_id } = db
    .prepare("INSERT INTO parties (room_id, last_card_played, direction, color) VALUES (?, ?, ?, ?)")
    .run(room_id, game.lastCard.card_id, game.direction, game.color);
  game.party_id = party_id;

  for (const uid of player_ids) {
    db.prepare("DELETE FROM party_players WHERE user_id = ?").run(uid);
    db.prepare("INSERT INTO party_players (party_id, user_id, is_spectator) VALUES (?, ?, 0)")
      .run(party_id, uid);
  }

  // Envoyer la main privée à chaque joueur connecté
  wss.clients.forEach((client) => {
    if (client.readyState !== 1 || String(client.room_id) !== String(room_id)) return;
    const uid = client.user?.id;
    if (!uid) return;
    client.send(JSON.stringify({ type: "hand_update", cards: game.handOf(uid) }));
  });

  // Broadcast état public + signal de démarrage
  broadcast(wss, room_id, { type: "game_started", room_id, ...game.publicState() });
}
