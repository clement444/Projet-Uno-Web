export function onDrawCard(message, socket, wss) {
  const { room_id, player_id } = message;
  socket.send(JSON.stringify({ type: "card_drawn", room_id, player_id }));
}
