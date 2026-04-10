import { check_auth } from "../../middleware/auth";
import { app } from "../../index";
import { logger_http } from "../../utils/logger";
import {
  createRoom,
  deleteRoom,
  getAllRooms,
  getRoomById,
  isPlayerInARoom,
} from "../../controllers/api/room";
import { Player } from "../../structures/game/player";

export default () => {
  app.get("/api/room", check_auth, function (_, res) {
    logger_http.info("[GET] /api/room");
    res.json(getAllRooms());
  });

  app.post("/api/room", check_auth, function (req, res) {
    res.setHeader("Content-Type", "application/json");
    const data = req.body;
    const user = res.locals.user;

    if (data.join) {
      const room_id = data.join;
      const room = getRoomById(room_id);
      if (!room)
        return res.status(404).json({ message: "Unable to join room." });

      try {
        const isInARoom = isPlayerInARoom(user.id);
        if (isInARoom)
          return res.status(401).json({
            message:
              "You cannot join more than 1 room, leave your current room before joining a new one.",
          });

        room.addPlayer(user.id);
        res.status(200).json(room);
      } catch (e) {
        switch (e) {
          case "Already in room":
            res.status(400).json({ message: e });
            break;
          case "Room is full":
            res.status(401).json({ message: e });
            break;
          default:
            res.status(500).json({ message: "Unable to join the room." });
            break;
        }
      }
    }

    if (data.leave) {
      const room_id = data.join;
      const room = getRoomById(room_id);
      if (!room)
        return res.status(404).json({ message: "Unable to leave room." });

      const isInRoom = room.getPlayer(user.id);
      if (!isInRoom)
        return res.status(400).json({ message: "You are not in the room." });

      room.removePlayer(user.id);
      res.status(200).json(room);
    }

    const name = data.name;
    const max_players = data.max_players;
    const player = [].push(new Player(user.id, user.username));

    createRoom(user.id, name, player, max_players);
  });

  app.delete("/api/room", check_auth, function (req, res) {
    res.setHeader("Content-Type", "application/json");
    const data = req.body;
    const room_id = data.room_id;

    const room = getRoomById(room_id);
    if (!room)
      return res.status(404).json({ message: "Unable to remove the room." });

    if (room.owner_id != res.locals.user.id)
      return res
        .status(401)
        .json({ message: "You can't remove room that is not yours." });

    deleteRoom(room_id);

    res.status(200).json({ message: "Room removed." });
  });
};
