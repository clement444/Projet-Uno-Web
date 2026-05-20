export class Card {
  id;
  color;
  type;

  constructor(id, color = 0) {
    this.id = id;
    this.color = color;
    this.type = [11, 12].includes(id) ? "wild" : id >= 10 ? "action" : "number";
  }
}
