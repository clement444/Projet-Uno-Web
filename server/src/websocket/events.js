import { Player } from "../structures/user/player.js";

/**
 * Dispatch un message WebSocket vers le bon handler selon son type.
 * @param {{ type: string, [key: string]: any }} message
 * @param {import("ws").WebSocket} socket
 * @param {import("ws").WebSocketServer} wss
 */
export function handleEvent(message, socket, wss) {
  switch (message.type) {
    case "join_room":
      onJoinRoom(message, socket, wss);
      break;
    case "leave_room":
      onLeaveRoom(message, socket, wss);
      break;
    case "play_card":
      onPlayCard(message, socket, wss);
      break;
    case "draw_card":
      onDrawCard(message, socket, wss);
      break;
    default:
      socket.send(JSON.stringify({ error: `Unknown event type: ${message.type}` }));
  }
}

/**
 * Un joueur rejoint une room.
 * @param {{ room_id: string, player_id: string, name: string }} message
 */
function onJoinRoom(message, socket, wss) {
  const { room_id, player_id, name } = message;
  // TODO: récupérer la room via l'API et y ajouter le joueur
  broadcast(wss, { type: "player_joined", room_id, player_id, name });
}

/**
 * Un joueur quitte une room.
 * @param {{ room_id: string, player_id: string }} message
 */
function onLeaveRoom(message, socket, wss) {
  const { room_id, player_id } = message;
  // TODO: retirer le joueur de la room
  broadcast(wss, { type: "player_left", room_id, player_id });
}

/**
 * Un joueur joue une carte.
 * @param {{ room_id: string, player_id: string, card_id: number }} message
 */
function onPlayCard(message, socket, wss) {
  const { room_id, player_id, card_id } = message;
  // TODO: vérifier la validité du coup via la logique de Thomas
  broadcast(wss, { type: "card_played", room_id, player_id, card_id });
}

/**
 * Un joueur pioche une carte.
 * @param {{ room_id: string, player_id: string }} message
 */
function onDrawCard(message, socket, wss) {
  const { room_id, player_id } = message;
  // TODO: piocher une carte et la renvoyer au joueur uniquement
  socket.send(JSON.stringify({ type: "card_drawn", room_id, player_id }));
}

/**
 * Envoie un message à tous les clients connectés.
 * @param {import("ws").WebSocketServer} wss
 * @param {object} data
 */
function broadcast(wss, data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}
