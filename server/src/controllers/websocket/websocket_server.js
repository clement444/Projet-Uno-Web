import { WebSocketServer } from "ws";
import { router } from "./router.js";
import { verify_token } from "../../utils/auth.js";
import db from "../../utils/db.js";

export function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (socket, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      socket.close(4001, "Token manquant");
      return;
    }

    try {
      const decoded = verify_token(token);

      const user = db
        .prepare("SELECT id, username FROM users WHERE id = ?")
        .get(decoded.user_id);

      if (!user) {
        socket.close(4001, "User not found.");
        return;
      }

      socket.user = user;
    } catch {
      socket.close(4001, "Invalid token.");
      return;
    }

    router(socket, wss);
  });

  return wss;
}
