import { WebSocketServer } from "ws";
import { router } from "./router.js";
import { verify_token } from "../../utils/auth.js";
import db from "../../utils/db.js";

export function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    handleProtocols: (protocols) => {
      if (protocols.has("Authorization")) return "Authorization";
      return false;
    },
  });

  wss.on("connection", (socket, req) => {
    const protocols = req.headers["sec-websocket-protocol"]?.split(", ") ?? [];
    const token = protocols[1]; // ["Authorization", "<token>"]

    if (!token) {
      socket.close(4001, "No Authorization header provided.");
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

      socket.user_id = user.id;
    } catch {
      socket.close(4001, "Invalid token.");
      return;
    }

    router(socket, wss);
  });

  return wss;
}
