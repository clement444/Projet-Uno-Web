import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "uno_secret_key";
const JWT_EXPIRES_IN = "24h";

export function generate_token(user_id) {
  return jwt.sign({ user_id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verify_token(token) {
  return jwt.verify(token, JWT_SECRET);
}
