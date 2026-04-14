import { Deck } from "./deck.js";
import db from "../../utils/db.js";

export class Game {
  party_id;
  players;
  drawPile;
  currentIndex;
  direction;
  unoPending;

  constructor(party_id, playerIds) {
    this.party_id = party_id;
    this.players = [...playerIds];
    this.drawPile = new Deck();
    this.currentIndex = 0;
    this.direction = 1;
    this.unoPending = new Set();

    for (const user_id of this.players) {
      for (let i = 0; i < 7; i++) {
        const card = this.drawPile.draw();
        db.prepare("INSERT INTO player_deck (card_id, color, party_id, user_id) VALUES (?, ?, ?, ?)")
          .run(card.id, card.color, party_id, user_id);
      }
    }

    let firstCard;
    do {
      firstCard = this.drawPile.draw();
    } while (firstCard.type !== "number");

    db.prepare("UPDATE parties SET last_card_played = ?, color = ?, direction = 1, current_player_id = ? WHERE id = ?")
      .run(firstCard.id, firstCard.color, this.players[0], party_id);
  }

  getCurrentPlayer() {
    return this.players[this.currentIndex];
  }

  getTopCard() {
    return db.prepare("SELECT last_card_played AS id, color FROM parties WHERE id = ?")
      .get(this.party_id);
  }

  getHand(player_id) {
    return db.prepare("SELECT id, card_id, color FROM player_deck WHERE party_id = ? AND user_id = ?")
      .all(this.party_id, player_id);
  }

  getOpponentState(exclude_id) {
    return this.players
      .filter((id) => id !== exclude_id)
      .map((id) => {
        const user = db.prepare("SELECT username FROM users WHERE id = ?").get(id);
        const card_count = db.prepare("SELECT COUNT(*) AS count FROM player_deck WHERE party_id = ? AND user_id = ?")
          .get(this.party_id, id).count;
        return { id, username: user?.username ?? `Joueur ${id}`, card_count };
      });
  }

  isPlayable(card) {
    const top = this.getTopCard();
    if ([11, 12].includes(card.card_id)) return true;
    return card.color === top.color || card.card_id === top.id;
  }

  nextTurn(skip = false) {
    const step = skip ? 2 : 1;
    this.currentIndex =
      (this.currentIndex + step * this.direction + this.players.length) %
      this.players.length;
    db.prepare("UPDATE parties SET current_player_id = ? WHERE id = ?")
      .run(this.players[this.currentIndex], this.party_id);
  }

  reverse() {
    this.direction *= -1;
    db.prepare("UPDATE parties SET direction = ? WHERE id = ?")
      .run(this.direction, this.party_id);
  }

  drawCards(player_id, count) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (this.drawPile.size === 0) break;
      const card = this.drawPile.draw();
      db.prepare("INSERT INTO player_deck (card_id, color, party_id, user_id) VALUES (?, ?, ?, ?)")
        .run(card.id, card.color, this.party_id, player_id);
      drawn.push(card);
    }
    return drawn;
  }

  removePlayer(player_id) {
    const idx = this.players.indexOf(player_id);
    if (idx === -1) return null;

    db.prepare("DELETE FROM player_deck WHERE party_id = ? AND user_id = ?").run(this.party_id, player_id);
    this.players.splice(idx, 1);

    if (this.players.length <= 1) {
      return { gameOver: true, winner_id: this.players[0] ?? null };
    }

    if (idx < this.currentIndex) {
      this.currentIndex--;
    } else if (idx === this.currentIndex) {
      this.currentIndex = this.currentIndex % this.players.length;
    }

    db.prepare("UPDATE parties SET current_player_id = ? WHERE id = ?")
      .run(this.players[this.currentIndex], this.party_id);

    return { gameOver: false, nextPlayer: this.players[this.currentIndex] };
  }

  playCard(player_id, card_id, new_color = null) {
    const row = db.prepare(
      "SELECT id, card_id, color FROM player_deck WHERE party_id = ? AND user_id = ? AND card_id = ? LIMIT 1"
    ).get(this.party_id, player_id, card_id);
    if (!row) return null;
    db.prepare("DELETE FROM player_deck WHERE id = ?").run(row.id);
    const color = new_color ?? row.color;
    db.prepare("UPDATE parties SET last_card_played = ?, color = ? WHERE id = ?")
      .run(card_id, color, this.party_id);
    return { id: row.card_id, color: row.color };
  }
}
