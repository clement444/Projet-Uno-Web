import { broadcast } from "../broadcast.js";

export function onStartGame(message, socket, wss) {
  const { room_id } = message;
  broadcast(wss, room_id, { type: "game_started", room_id });
}
