import { WebSocketServer } from "ws";
import { router } from "./router.js";
import { verify_token } from "../../utils/auth.js";
import db from "../../utils/db.js";

export function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (socket, req) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      socket.close(4001, "No Authorization header provided.");
      return;
    }

    const token = authHeader.split(" ")[1];

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
