export function broadcast(wss, room_id, data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.room_id === room_id) {
      client.send(payload);
    }
  });
}
