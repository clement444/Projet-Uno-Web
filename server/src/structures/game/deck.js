import { Card } from "./card.js";

const COLORS = [1, 2, 3, 4];
const DOUBLE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14];

export class Deck {
  cards = [];

  constructor() {
    this.generate();
    this.shuffle();
  }

  generate() {
    for (const color of COLORS) {
      this.cards.push(new Card(0, color));
      for (const id of DOUBLE_IDS) {
        this.cards.push(new Card(id, color));
        this.cards.push(new Card(id, color));
      }
    }
    for (let i = 0; i < 4; i++) {
      this.cards.push(new Card(11, 0));
      this.cards.push(new Card(12, 0));
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
}
