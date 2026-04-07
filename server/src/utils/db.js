import { Database } from "bun:sqlite";
import { fileURLToPath } from "url";

const dbPath = fileURLToPath(new URL("../../data/db.sqlite", import.meta.url));
const db = new Database(dbPath);

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT    UNIQUE NOT NULL,
    password TEXT    NOT NULL
  )
`);

<<<<<<< HEAD
db.run(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ownerId INTEGER NOT NULL,
    name TEXT NOT NULL,
    players TEXT NOT NULL,
    max_players INTEGER NOT NULL
  )
`);

=======
>>>>>>> 043250c3f8ac1216976a857f96f8afac2ceecf74
export default db;
