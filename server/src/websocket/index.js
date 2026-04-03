import { WebSocketServer } from "ws";
import { router } from "./router.js";

/**
 * Attache le serveur WebSocket à l'instance HTTP d'Express.
 * @param {import("http").Server} httpServer
 */
export function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (socket, request) => {
    router(socket, request, wss);
  });

  return wss;
}
