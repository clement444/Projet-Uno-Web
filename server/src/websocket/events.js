import { Player } from "../structures/user/player.js";

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

function onJoinRoom(message, socket, wss) {
  const { room_id, player_id, name } = message;
  broadcast(wss, { type: "player_joined", room_id, player_id, name });
}

function onLeaveRoom(message, socket, wss) {
  const { room_id, player_id } = message;
  broadcast(wss, { type: "player_left", room_id, player_id });
}

function onPlayCard(message, socket, wss) {
  const { room_id, player_id, card_id } = message;
  broadcast(wss, { type: "card_played", room_id, player_id, card_id });
}

function onDrawCard(message, socket, wss) {
  const { room_id, player_id } = message;
  socket.send(JSON.stringify({ type: "card_drawn", room_id, player_id }));
}

function broadcast(wss, data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}
