import { Deck } from "./deck.js";

export class Game {
  players;
  hands;
  drawPile;
  discardPile;
  currentIndex;
  direction;
  topColor;
  unoPending;

  constructor(playerIds) {
    this.players = [...playerIds];
    this.hands = new Map();
    this.drawPile = new Deck();
    this.discardPile = [];
    this.currentIndex = 0;
    this.direction = 1;
    this.unoPending = new Set();

    for (const id of this.players) {
      this.hands.set(id, []);
    }

    for (let i = 0; i < 7; i++) {
      for (const id of this.players) {
        this.hands.get(id).push(this.drawPile.draw());
      }
    }

    let firstCard;
    do {
      firstCard = this.drawPile.draw();
    } while (firstCard.type !== "number");
    this.discardPile.push(firstCard);
    this.topColor = firstCard.color;
  }

  getCurrentPlayer() {
    return this.players[this.currentIndex];
  }

  getTopCard() {
    return this.discardPile[this.discardPile.length - 1];
  }

  getHandIds(player_id) {
    return (this.hands.get(player_id) || []).map((c) => c.id);
  }

  getOpponentState(exclude_id) {
    return this.players
      .filter((id) => id !== exclude_id)
      .map((id) => ({ id, card_count: (this.hands.get(id) || []).length }));
  }
}
