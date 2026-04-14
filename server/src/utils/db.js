import { Database } from "bun:sqlite";
import { fileURLToPath } from "url";

const dbPath = fileURLToPath(new URL("../../data/db.sqlite", import.meta.url));
const db = new Database(dbPath);

// Users data
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL
  )
`);

// Room data
db.run(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL UNIQUE,
    max_players INTEGER NOT NULL CHECK(max_players > 0),
    FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS room_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(room_id, user_id)
  )
`);

// Parties data
db.run(`
  CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    last_card_played INTEGER,
    direction INTEGER DEFAULT 1,
    color INTEGER,
    current_player_id INTEGER,
    room_id INTEGER NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
  )
`);

// Migration : party_players.user_id était UNIQUE global → doit être UNIQUE(party_id, user_id)
const ppSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='party_players'").get();
if (ppSchema?.sql?.includes("user_id INTEGER NOT NULL UNIQUE")) {
  db.run("DROP TABLE IF EXISTS party_players");
}

db.run(`
  CREATE TABLE IF NOT EXISTS party_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    is_spectator INTEGER NOT NULL CHECK(is_spectator IN (0, 1)) DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(party_id) REFERENCES parties(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(party_id, user_id)
  )
`);

// Migration : player_deck avait UNIQUE(party_id, user_id, card_id) → un joueur peut avoir plusieurs fois le même card_id
const pdSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='player_deck'").get();
if (pdSchema?.sql?.includes("UNIQUE(party_id, user_id, card_id)")) {
  db.run("DROP TABLE IF EXISTS player_deck");
}

db.run(`
  CREATE TABLE IF NOT EXISTS player_deck (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    color INTEGER NOT NULL DEFAULT 0,
    party_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(party_id) REFERENCES parties(id) ON DELETE CASCADE
  )
`);

// Indexing
db.run(
  `CREATE INDEX IF NOT EXISTS idx_room_players_user ON room_players (user_id)`,
);
db.run(
  `CREATE INDEX IF NOT EXISTS idx_party_players_user ON party_players (user_id)`,
);
db.run(
  `CREATE INDEX IF NOT EXISTS idx_player_deck_user ON player_deck (user_id)`,
);

export default db;
