export function broadcast(wss, room_id, data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && String(client.room_id) === String(room_id)) {
      client.send(payload);
    }
  });
}
