import db from "../../utils/db";
import {
  deleteRoom,
  getRoomById,
  isPlayerInARoom,
} from "../../controllers/api/room";

export class Room {
  id;
  owner_id;
  name;
  is_started;
  max_players;

  constructor(id, name, owner_id, max_players) {
    this.id = id;
    this.name = name;
    this.owner_id = owner_id;
    this.max_players = max_players;
  }

  changeOwnership(player_id) {
    const room = getRoomById(this.id);
    if (!room) return null;

    const stmt = db.prepare("UPDATE rooms SET owner_id = ? WHERE id = ?");
    stmt.run(player_id, this.id);

    return getRoomById(this.id);
  }

  startParty() {
    const stmt = db.prepare("UPDATE rooms SET is_started = 1 WHERE id = ?");
    stmt.run(this.id);

    this.is_started = true;
  }

  stopParty() {
    const stmt = db.prepare("UPDATE rooms SET is_started = 0 WHERE id = ?");
    stmt.run(this.id);

    this.is_started = false;
  }

  addPlayer(player_id) {
    const exists = db
      .prepare("SELECT 1 FROM room_players WHERE room_id = ? AND user_id = ?")
      .get(this.id, player_id);
    if (exists) return;

    this._checkCapacity();

    const isInARoom = isPlayerInARoom(player_id);
    if (isInARoom) return;

    db.prepare(
      "INSERT INTO room_players (room_id, user_id, is_bot) VALUES (?, ?, 0)",
    ).run(this.id, player_id);
  }

  removePlayer(player_id) {
    db.prepare(
      "DELETE FROM room_players WHERE room_id = ? AND user_id = ?",
    ).run(this.id, player_id);

    const players = this.getPlayers();
    if (players.length === 0) {
      deleteRoom(this.id);
    }
  }

  addBot() {
    const bot_id = `bot_${Math.floor(Math.random() * 1000)}`;
    const exists = db
      .prepare(
        "SELECT 1 FROM room_players WHERE room_id = ? AND user_id = ? AND is_bot = 1",
      )
      .get(this.id, bot_id);

    if (exists) return;

    this._checkCapacity();

    const botNames = [
      "RoboMax",
      "ByteCrusher",
      "NeonPulse",
      "CircuitGhost",
      "AlphaBot",
      "OmegaUnit",
      "SteelMind",
      "QuantumSpark",
      "NovaCore",
      "PixelPhantom",
    ];
    const bot_name = botNames[Math.floor(Math.random() * botNames.length)];

    db.prepare(
      "INSERT INTO room_players (room_id, user_id, bot_name, is_bot) VALUES (?, ?, ?, 1)",
    ).run(this.id, bot_id, bot_name);

    return {
      id: bot_id,
      name: bot_name,
    };
  }

  removeBot(bot_id) {
    db.prepare(
      "DELETE FROM room_players WHERE room_id = ? AND user_id = ? AND is_bot = 1",
    ).run(this.id, bot_id);

    const players = this.getPlayers();
    const bots = this.getBots();

    if (players.length === 0 && bots.length === 0) {
      deleteRoom(this.id);
    }
  }

  getPlayer(player_id) {
    const row = db
      .prepare(
        "SELECT user_id FROM room_players WHERE room_id = ? AND user_id = ?",
      )
      .get(this.id, player_id);

    return row ? row.user_id : null;
  }

  getPlayers() {
    const rows = db
      .prepare(
        `
        SELECT users.id, users.username, room_players.joined_at
        FROM room_players
        JOIN users ON users.id = room_players.user_id
        WHERE room_players.room_id = ? AND is_bot = 0
        ORDER BY room_players.joined_at ASC
      `,
      )
      .all(this.id);

    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      joined_at: r.joined_at,
    }));
  }

  getBots() {
    const rows = db
      .prepare(
        `
      SELECT user_id, bot_name, joined_at
      FROM room_players
      WHERE room_id = ? AND is_bot = 1
      ORDER BY joined_at ASC
      `,
      )
      .all(this.id);

    return rows.map((r) => ({
      id: r.user_id,
      name: r.bot_name,
      joined_at: r.joined_at,
    }));
  }

  getParticipants() {
    const players = this.getPlayers();
    const bots = this.getBots();

    const normalizedBots = bots.map((b) => ({
      id: b.id,
      username: null,
      joined_at: b.joined_at,
      is_bot: true,
    }));

    const normalizedPlayers = players.map((p) => ({
      id: p.id,
      username: p.username,
      joined_at: p.joined_at,
      is_bot: false,
    }));

    return [...normalizedPlayers, ...normalizedBots].sort(
      (a, b) => new Date(a.joined_at) - new Date(b.joined_at),
    );
  }

  _checkCapacity() {
    const count = this.getParticipants().length;
    if (count >= this.max_players) {
      throw new Error("Room player limit exceeded");
    }
  }
}
