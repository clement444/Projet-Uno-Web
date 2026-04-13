import { Game } from "../../structures/game/game.js";

const games = new Map();

export function createGame(room_id, party_id, playerIds) {
  const game = new Game(party_id, playerIds);
  games.set(room_id, game);
  return game;
}

export function getGame(room_id) {
  return games.get(room_id) || null;
}

export function deleteGame(room_id) {
  games.delete(room_id);
}
