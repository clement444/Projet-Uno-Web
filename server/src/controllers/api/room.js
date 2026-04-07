import { Room } from "../../structures/game/room";
import { rooms } from "../../../data/game";

export function newRoom(id, name, max_players) {
  rooms.push(new Room(id, name, max_players));
}

export function removeRoom(room_id) {
  const index = rooms.findIndex((room) => room_id === room.id);

  if (index != -1) {
    rooms.splice(index, 1);
    return true;
  }

  return false;
}
