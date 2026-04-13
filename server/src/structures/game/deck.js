import { Card } from "./card.js";

const COLORS = ["red", "blue", "green", "yellow"];
const ACTIONS = ["skip", "reverse", "draw2"];

export class Deck {
  cards = [];

  constructor() {
    this.generate();
    this.shuffle();
  }

  generate() {
    for (const color of COLORS) {
      this.cards.push(new Card(color, "0"));
      for (const value of ["1", "2", "3", "4", "5", "6", "7", "8", "9", ...ACTIONS]) {
        this.cards.push(new Card(color, value));
        this.cards.push(new Card(color, value));
      }
    }
    for (let i = 0; i < 4; i++) {
      this.cards.push(new Card("wild", "wild"));
      this.cards.push(new Card("wild", "wild_draw4"));
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw() {
    return this.cards.pop();
  }

  refill(discardPile) {
    const top = discardPile.pop();
    this.cards = discardPile.splice(0);
    discardPile.push(top);
    this.shuffle();
  }

  get size() {
    return this.cards.length;
  }
}
