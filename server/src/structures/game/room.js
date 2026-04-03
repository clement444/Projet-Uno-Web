export class Room {
  id;
  name;
  players;
  max_players;

  constructor(id, name, max_players) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.max_players = max_players;
  }

  addPlayer(player) {
    this.players.push(player);
  }

  removePlayer(player_id) {
    const index = this.players.findIndex((player) => player_id === player.id);

    if (index != -1) {
      this.players.splice(index, 1);
      return true;
    }

    return false;
  }
}
