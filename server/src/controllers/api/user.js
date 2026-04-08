import bcrypt from "bcryptjs";
import { generate_token } from "../../utils/auth";
import db from "../../utils/db";

export function createUser(username, password) {
  const password_hash = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare(
      "INSERT INTO users (username, password) VALUES (?, ?)",
    );
    const result = stmt.run(username, password_hash);
    const user_id = result.lastInsertRowid;

    const token = generate_token(user_id, password_hash);
    return { user_id, token };
  } catch {
    return null;
  }
}

export function loginUser(username, password_hash) {
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);

  if (!user) return null;

  const valid = bcrypt.compareSync(password_hash, user.password);
  if (!valid) return null;

  const token = generate_token(user.id, user.password);
  return { user_id: user.id, token };
}

export function removeUser(user_id) {
  const stmt = db.prepare("DELETE FROM users WHERE id = ?");
  const result = stmt.run(user_id);
  return result.changes > 0;
}
