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
      .map((id) => ({
        id,
        card_count: db.prepare("SELECT COUNT(*) AS count FROM player_deck WHERE party_id = ? AND user_id = ?")
          .get(this.party_id, id).count,
      }));
  }
}
