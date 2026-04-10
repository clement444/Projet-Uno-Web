import db from "../../utils/db";
import { getRoomById } from "../../controllers/api/room";

export class Room {
  id;
  owner_id;
  name;
  max_players;

  constructor(id, name, max_players) {
    this.id = id;
    this.name = name;
    this.max_players = max_players;
  }

  changeOwnership(player_id) {
    const room = getRoomById(this.id);
    if (!room) return null;

    const stmt = db.prepare("UPDATE rooms SET owner_id = ? WHERE id = ?");
    stmt.run(newOwnerId, this.id);

    return getRoomById(this.id);
  }

  addPlayer(player_id) {
    const exists = db
      .prepare("SELECT 1 FROM room_players WHERE room_id = ? AND user_id = ?")
      .get(this.id, player_id);
    if (exists) return;

    // Insert player
    db.prepare("INSERT INTO room_players (room_id, user_id) VALUES (?, ?)").run(
      this.id,
      player_id,
    );
  }

  removePlayer(player_id) {
    db.prepare(
      "DELETE FROM room_players WHERE room_id = ? AND user_id = ?",
    ).run(this.id, player_id);
  }

  getPlayer(player_id) {
    const row = db
      .prepare(
        "SELECT user_id FROM room_players WHERE room_id = ? AND user_id = ?",
      )
      .get(this.id, player_id);

    return row ? row.user_id : null;
  }

  getPlayers() {
    const rows = db
      .prepare("SELECT user_id FROM room_players WHERE room_id = ?")
      .all(this.id);

    return rows.map((r) => r.user_id);
  }
}
