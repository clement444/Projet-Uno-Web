import { verify_token } from "../utils/auth";

export function check_auth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }
  try {
    req.user = verify_token(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}
