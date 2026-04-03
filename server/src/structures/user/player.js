export class Player {
  id;
  name;
  cards;

  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.cards = [];
  }

  addCard(card) {
    this.cards.push(card);
  }

  removeCard(card_index) {
    this.players.splice(card_index, 1);
  }

  setDeck(cards) {
    this.cards = cards;
  }
}
