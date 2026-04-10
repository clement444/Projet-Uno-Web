import { verify_token } from "../utils/auth";
import db from "../utils/db";

export function check_auth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }
  try {
    const decoded = verify_token(auth.slice(7));
    const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(decoded.user_id);
    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable" });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}
