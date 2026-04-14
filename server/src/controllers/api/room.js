import { Room } from "../../structures/game/room";
import db from "../../utils/db";

export function createRoom(ownerId, name, maxPlayers = 4) {
  if (name.trim() == "") throw new Error("No name provided.");

  const existing = db
    .prepare("SELECT id FROM rooms WHERE name = ? LIMIT 1")
    .get(name);

  if (existing) {
    throw new Error("A room with this name already exists.");
  }

  if (isPlayerInARoom(ownerId))
    throw new Error("You can't create another room while being in one.");

  const stmt = db.prepare(
    "INSERT INTO rooms (owner_id, name, max_players) VALUES (?, ?, ?)",
  );
  const info = stmt.run(ownerId, name, maxPlayers);

  // Ajouter un évènement WS pour afficher le nouveau salon créé

  return getRoomById(info.lastInsertRowid);
}


export function getRoomById(id) {
  const stmt = db.prepare(`
    SELECT
      rooms.*,
      COUNT(room_players.id) AS player_count
    FROM rooms
    LEFT JOIN room_players
      ON rooms.id = room_players.room_id
    WHERE rooms.id = ?
    GROUP BY rooms.id
  `);

  const row = stmt.get(id);
  if (!row) return null;

  const room = new Room(row.id, row.name, row.owner_id, row.max_players);
  room.player_count = row.player_count;

  return room;
}


export function getAllRooms() {
  const stmt = db.prepare(`
    SELECT
      rooms.*,
      COUNT(room_players.id) AS player_count
    FROM rooms
    LEFT JOIN room_players
      ON rooms.id = room_players.room_id
    GROUP BY rooms.id
  `);

  return stmt.all();
}

export function deleteRoom(id) {
  const stmt = db.prepare("DELETE FROM rooms WHERE id = ?");
  stmt.run(id);
}

export function isPlayerInARoom(player_id) {
  const row = db
    .query("SELECT 1 FROM room_players WHERE user_id = ? LIMIT 1")
    .get(player_id);

  return !!row;
}
