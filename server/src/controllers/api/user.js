import db from "../../utils/db";
import { generate_token } from "../../utils/auth";

export async function createUser(req, res) {
  const { username, password } = req.body;
  if (
    !username ||
    !password ||
    username.trim() === "" ||
    password.trim() === ""
  )
    return res
      .status(400)
      .json({ message: "Username and password is required." });

  if (username.length > 20)
    return res.status(400).json({ message: "Username too long." });

  const hashed = await Bun.password.hash(password);
  try {
    const stmt = db.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    );

    const result = stmt.run(username, hashed);
    const token = generate_token(result.lastInsertRowid);

    res.status(201).json({ token });
  } catch (err) {
    console.error("createUser error:", err);

    if (err.message?.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ message: "Username already taken." });
    }

    res.status(500).json({ message: "Cannot create account." });
  }
}

export async function loginUser(req, res) {
  const { username, password } = req.body;
  if (
    !username ||
    !password ||
    username.trim() === "" ||
    password.trim() === ""
  )
    return res
      .status(400)
      .json({ message: "Username and password is required." });

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
  if (!user) {
    return res.status(401).json({ message: "Wrong credentials." });
  }

  const valid = await Bun.password.verify(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ message: "Wrong credentials." });
  }

  const token = generate_token(user.id);
  res.json({ token });
}

export function removeUser() {}
