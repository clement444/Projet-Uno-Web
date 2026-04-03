import { Room } from "../structures/game/room.js";

const rooms = new Map();

/**
 * Crée une nouvelle room et la stocke en mémoire.
 * @param {string} id
 * @param {string} name
 * @param {number} max_players
 * @returns {Room}
 */
export function createRoom(id, name, max_players) {
  const room = new Room(id, name, max_players);
  rooms.set(id, room);
  return room;
}

/**
 * Retourne une room par son id.
 * @param {string} id
 * @returns {Room | undefined}
 */
export function getRoom(id) {
  return rooms.get(id);
}

/**
 * Supprime une room par son id.
 * @param {string} id
 * @returns {boolean}
 */
export function deleteRoom(id) {
  return rooms.delete(id);
}

/**
 * Retourne toutes les rooms actives.
 * @returns {Room[]}
 */
export function getAllRooms() {
  return Array.from(rooms.values());
}
