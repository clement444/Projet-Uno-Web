import { handleEvent } from "./events.js";

export function router(socket, request, wss) {
  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      socket.send(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    handleEvent(message, socket, wss);
  });

  socket.on("close", () => {
    // TODO: nettoyage de la partie liée au socket
  });
}
