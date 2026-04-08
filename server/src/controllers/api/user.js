import db from "../../utils/db";
import { generate_token } from "../../utils/auth";

export async function createUser(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Pseudo et mot de passe requis" });
  }
  const hashed = await Bun.password.hash(password);
  try {
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    const result = stmt.run(username, hashed);
    const token = generate_token(result.lastInsertRowid);
    res.status(201).json({ token });
  } catch {
    res.status(409).json({ error: "Nom d'utilisateur déjà pris" });
  }
}

export async function loginUser(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Pseudo et mot de passe requis" });
  }
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }
  const valid = await Bun.password.verify(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }
  const token = generate_token(user.id);
  res.json({ token });
}

export function removeUser() {}
