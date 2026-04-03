import { WebSocketServer } from "ws";
import { router } from "./router.js";

export function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (socket, request) => {
    router(socket, request, wss);
  });

  return wss;
}
