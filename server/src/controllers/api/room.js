import { Room } from "../../structures/game/room";

// Créer une room
function createRoom({ ownerId, name, players = "[]", max_players = 4 }) {
  const stmt = db.prepare(
    "INSERT INTO rooms (ownerId, name, players, max_players) VALUES (?, ?, ?, ?)",
  );
  const info = stmt.run(ownerId, name, players, max_players);
  return getRoomById(info.lastInsertRowId);
}

// Récupérer une room par id
function getRoomById(id) {
  const stmt = db.prepare("SELECT * FROM rooms WHERE id = ?");
  const row = stmt.get(id);
  if (!row) return null;
  // On parse les joueurs (stockés en JSON)
  const players = JSON.parse(row.players);
  const room = new Room(row.id, row.name, row.max_players);
  room.players = players;
  return room;
}

// Lister toutes les rooms
function getAllRooms() {
  const stmt = db.prepare("SELECT * FROM rooms");
  const rows = stmt.all();
  return rows.map((row) => {
    const players = JSON.parse(row.players);
    const room = new Room(row.id, row.name, row.max_players);
    room.players = players;
    return room;
  });
}

// Supprimer une room
function deleteRoom(id) {
  const stmt = db.prepare("DELETE FROM rooms WHERE id = ?");
  stmt.run(id);
}

export { createRoom, getRoomById, getAllRooms, deleteRoom };
