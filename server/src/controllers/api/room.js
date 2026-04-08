import { Room } from "../../structures/game/room";
import db from "../../utils/db";

export function createRoom(ownerId, name, maxPlayers = 4) {
  const stmt = db.prepare(
    "INSERT INTO rooms (owner_id, name, max_players) VALUES (?, ?, ?)",
  );
  const info = stmt.run(ownerId, name, maxPlayers);
  return getRoomById(info.lastInsertRowId);
}

export function getRoomById(id) {
  const stmt = db.prepare("SELECT * FROM rooms WHERE id = ?");
  const row = stmt.get(id);
  if (!row) return null;
  const room = new Room(row.id, row.name, row.max_players);
  return room;
}

export function getAllRooms() {
  const stmt = db.prepare("SELECT * FROM rooms");
  const rows = stmt.all();
  return rows;
}

export function deleteRoom(id) {
  const stmt = db.prepare("DELETE FROM rooms WHERE id = ?");
  stmt.run(id);
}
