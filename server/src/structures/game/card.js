export class Card {
  id;
  color;
  value;
  type;

  constructor(color, value) {
    this.color = color;
    this.value = value;
    this.type = color === "wild" ? "wild" : isNaN(value) ? "action" : "number";
    this.id = color === "wild" ? value : `${color}_${value}`;
  }
}
