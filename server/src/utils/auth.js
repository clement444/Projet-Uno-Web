import db from "./db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "uno_secret_key";

export function generate_token(user_id) {
  return jwt.sign({ user_id }, JWT_SECRET, { expiresIn: "24h" });
}

export function verify_token(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function token_to_user(token) {
  try {
    const decoded = verify_token(token);
    const user = db
      .prepare("SELECT id, username FROM users WHERE id = ?")
      .get(decoded.user_id);
    if (!user) throw new Error("User not found for this token.");

    return user;
  } catch (e) {
    throw new Error("Invalid token.");
  }
}
