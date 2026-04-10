import { WebSocketServer } from "ws";
import { router } from "./router.js";

export function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (socket) => {
    router(socket, wss);
  });

  return wss;
}
