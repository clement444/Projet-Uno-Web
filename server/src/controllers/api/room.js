import { getRoomBots } from "../../structures/game/bot";
import { Room } from "../../structures/game/room";
import db from "../../utils/db";

export function createRoom(ownerId, name, maxPlayers = 4) {
  if (name.trim() == "")
    throw new Error(
      JSON.stringify({
        status_code: 400,
        message: "No name provided.",
      }),
    );

  const existing = db
    .prepare("SELECT id FROM rooms WHERE name = ? LIMIT 1")
    .get(name);

  if (existing) {
    throw new Error(
      JSON.stringify({
        status_code: 401,
        message: "Ce nom existe déjà pour un salon.",
      }),
    );
  }

  if (isPlayerInARoom(ownerId))
    throw new Error(
      JSON.stringify({
        status_code: 401,
        message: "Vous ne pouvez créer un salon en étant déjà dans un salon.",
      }),
    );

  const stmt = db.prepare(
    "INSERT INTO rooms (owner_id, name, max_players) VALUES (?, ?, ?)",
  );
  const info = stmt.run(ownerId, name, maxPlayers);

  return getRoomById(info.lastInsertRowid);
}

export function getRoomById(id) {
  const stmt = db.prepare(`
    SELECT
      rooms.*,
      COUNT(room_players.id) AS participants_count
    FROM rooms
    LEFT JOIN room_players
      ON rooms.id = room_players.room_id
    WHERE rooms.id = ?
    GROUP BY rooms.id
  `);

  const row = stmt.get(id);
  if (!row) return null;

  const room = new Room(row.id, row.name, row.owner_id, row.max_players);
  room.participants_count = room.getParticipants().length;

  return room;
}

export function getAllRooms() {
  const stmt = db.prepare(`
    SELECT
      rooms.id,
      rooms.owner_id,
      rooms.name,
      rooms.max_players,
      COUNT(room_players.id) AS participants_count
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

export function playerCurrentRoomId(player_id) {
  const row = db
    .query("SELECT room_id FROM room_players WHERE user_id = ? LIMIT 1")
    .get(player_id);

  return row ? row.room_id : null;
}
