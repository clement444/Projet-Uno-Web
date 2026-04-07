import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "24h";

export function generate_token(user_id, password_hash) {
  return jwt.sign({ user_id }, password_hash + JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verify_token(token, password_hash) {
  return jwt.verify(token, password_hash + JWT_SECRET);
}
