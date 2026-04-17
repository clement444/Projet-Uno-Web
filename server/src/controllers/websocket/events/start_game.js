import { broadcast } from "../broadcast.js";
import { GameState } from "../../../structures/game/game_state.js";
import {
  getRoomBots,
  isBot,
  scheduleBotTurn,
} from "../../../structures/game/bot.js";
import db from "../../../utils/db.js";

export function onStartGame(message, socket, wss) {
  const { room_id } = message;
  const user_id = socket.user?.id;

  const room = db
    .prepare("SELECT owner_id FROM rooms WHERE id = ?")
    .get(room_id);
  if (!room)
    return socket.send(
      JSON.stringify({ type: "error", code: "room_not_found" }),
    );

  if (String(room.owner_id) !== String(user_id))
    return socket.send(
      JSON.stringify({
        type: "error",
        code: "not_owner",
      }),
    );

  const rows = db
    .prepare(
      "SELECT user_id FROM room_players WHERE room_id = ? ORDER BY joined_at ASC",
    )
    .all(room_id);

  const humanIds = rows.map((r) => r.user_id);
  const bots = getRoomBots(room_id);
  const botIds = bots.map((b) => b.id);
  const player_ids = [...humanIds, ...botIds];

  if (player_ids.length < 2) {
    socket.send(JSON.stringify({ type: "error", error: "not_enough_players" }));
    return;
  }

  const game = new GameState(room_id, player_ids);

  // Persister la partie (seulement les humains)
  const { lastInsertRowid: party_id } = db
    .prepare(
      "INSERT INTO parties (room_id, last_card_played, direction, color) VALUES (?, ?, ?, ?)",
    )
    .run(room_id, game.lastCard.card_id, game.direction, game.color);
  game.party_id = party_id;

  for (const uid of humanIds) {
    db.prepare("DELETE FROM party_players WHERE user_id = ?").run(uid);
    db.prepare(
      "INSERT INTO party_players (party_id, user_id, is_spectator) VALUES (?, ?, 0)",
    ).run(party_id, uid);
  }

  // Envoyer la main privée à chaque joueur humain connecté
  wss.clients.forEach((client) => {
    if (client.readyState !== 1 || String(client.room_id) !== String(room_id))
      return;
    const uid = client.user?.id;
    if (!uid) return;
    client.send(
      JSON.stringify({ type: "hand_update", cards: game.handOf(uid) }),
    );
  });

  // Broadcast état public + signal de démarrage
  broadcast(wss, room_id, {
    type: "game_started",
    room_id,
    ...game.publicState(),
  });

  // Si c'est le tour d'un bot, le faire jouer
  scheduleBotTurn(game, wss);
}
