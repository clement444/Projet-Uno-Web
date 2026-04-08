import db from "../utils/db";
import { verify_token } from "../utils/auth";

export function check_auth(req, res, next) {
  const auth_header = req.headers["authorization"];

  if (!auth_header || !auth_header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

  const token = auth_header.split("Bearer ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token" });

  try {
    const payload = verify_token_from_db(token);
    res.locals.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function verify_token_from_db(token) {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString(),
  );

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(payload.user_id);

  if (!user) throw new Error("User not found");

  return verify_token(token, user.password);
}
