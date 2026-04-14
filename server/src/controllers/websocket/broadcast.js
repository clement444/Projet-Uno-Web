export function broadcast(wss, room_id, data, exclude_socket = null) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.room_id === room_id && client !== exclude_socket) {
      client.send(payload);
    }
  });
}

export function sendToPlayer(wss, user_id, data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.user?.id === user_id) {
      client.send(payload);
    }
  });
}
