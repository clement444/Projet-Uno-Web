import db from "../../utils/db";
import {
  deleteRoom,
  getRoomById,
  isPlayerInARoom,
} from "../../controllers/api/room";

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
    stmt.run(player_id, this.id);

    return getRoomById(this.id);
  }

  addPlayer(player_id) {
    const exists = db
      .prepare("SELECT 1 FROM room_players WHERE room_id = ? AND user_id = ?")
      .get(this.id, player_id);
    if (exists) return;

    const isInARoom = isPlayerInARoom(player_id);
    if (isInARoom) return;

    db.prepare("INSERT INTO room_players (room_id, user_id) VALUES (?, ?)").run(
      this.id,
      player_id,
    );
  }

  removePlayer(player_id) {
    db.prepare(
      "DELETE FROM room_players WHERE room_id = ? AND user_id = ?",
    ).run(this.id, player_id);

    const player_count = this.getPlayers();
    console.log(player_count);
    if (player_count == 0) {
      deleteRoom(this.id);
    }
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
