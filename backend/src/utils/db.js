import { Database } from "bun:sqlite";

const db = new Database(new URL("../../data/", import.meta.url).pathname);

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT    UNIQUE NOT NULL,
    password TEXT    NOT NULL
  )
`);

export default db;
