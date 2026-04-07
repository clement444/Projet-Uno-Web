import { Database } from "bun:sqlite";
<<<<<<< HEAD

const db = new Database(new URL("../../data/", import.meta.url).pathname);
=======
import { fileURLToPath } from "url";

const dbPath = fileURLToPath(new URL("../../data/db.sqlite", import.meta.url));
const db = new Database(dbPath);
>>>>>>> 9d848dcfb6c9836da051f754ae7f4eda047a9f2b

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT    UNIQUE NOT NULL,
    password TEXT    NOT NULL
  )
`);

export default db;
