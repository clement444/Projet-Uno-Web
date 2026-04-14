import { check_auth } from "../../middleware/auth";
import { app } from "../../index";
import { logger_http } from "../../utils/logger";
import {
  createRoom,
  deleteRoom,
  getAllRooms,
  getRoomById,
  isPlayerInARoom,
  playerCurrentRoomId,
} from "../../controllers/api/room";

export default () => {
  app.get("/api/room", check_auth, function (req, res) {
    logger_http.info("[GET] /api/room");

    const room_id = req.id;

    if (req.query.mine) {
      const room =
        getAllRooms().find((r) => r.owner_id === req.user.id) ?? null;
      return res.status(200).json({
        id: room.id,
        owner_id: room.owner_id,
        name: room.name,
        players: room.getPlayers(),
        max_players: room.max_players,
      });
    }

    if (room_id) {
      const room = getRoomById(room_id);

      if (room.length < 1) {
        res.status(404).json({ message: "Salon inexistant." });
      } else {
        const currentRoomId = playerCurrentRoomId(req.user.id);
        if (currentRoomId === req.user.room_id) {
          return res.status(200).json({
            id: room.id,
            owner_id: room.owner_id,
            name: room.name,
            players: room.getPlayers(),
            max_players: room.max_players,
          });
        } else {
          return res.status(401).json({
            message:
              "Vous n'êtes pas dans le salon, donc vous ne pouvez voir ses informations.",
          });
        }
      }
    } else {
      res.json(getAllRooms());
    }
  });

  app.post("/api/room", check_auth, function (req, res) {
    logger_http.info("[POST] /api/room");

    res.setHeader("Content-Type", "application/json");
    const body = req.body;
    const data = req.query;
    const user = req.user;

    if (data.join) {
      const room_id = data.join;
      const room = getRoomById(room_id);
      if (!room)
        return res
          .status(404)
          .json({ message: "Impossible de rejoindre le salon." });

      try {
        const isInARoom = isPlayerInARoom(user.id);

        if (isInARoom) {
          return res.status(200).json({
            id: room.id,
            owner_id: room.owner_id,
            name: room.name,
            max_players: room.max_players,
            isPlayerHost: true,
          });
        }

        room.addPlayer(user.id);
        return res.status(200).json({
          id: room.id,
          owner_id: room.owner_id,
          name: room.name,
          max_players: room.max_players,
          isPlayerHost: room.owner_id == user.id,
        });
      } catch (e) {
        const err = JSON.parse(e.message);
        return res.status(err.status_code).json({ message: err.message });
      }
    }

    if (data.leave) {
      const room_id = data.leave;
      const room = getRoomById(room_id);
      if (!room)
        return res
          .status(404)
          .json({ message: "Impossible de quitter le salon." });

      const isInRoom = room.getPlayer(user.id);
      if (!isInRoom)
        return res
          .status(400)
          .json({ message: "Vous n'êtes pas dans le salon." });

      room.removePlayer(user.id);
      return res.status(200).json({
        id: room.id,
        name: room.name,
      });
    }

    if (isPlayerInARoom(user.id)) {
      return res.status(400).json({
        message:
          "Vous avez déjà un salon actif. Supprimez-le avant d'en créer un nouveau.",
      });
    }

    try {
      const room = createRoom(user.id, body.name, body.max_players);
      if (!room)
        return res
          .status(500)
          .json({ message: "Impossible de créer le salon." });

      room.addPlayer(user.id);
      return res.status(201).json({
        id: room.id,
        owner_id: room.owner_id,
        name: room.name,
        max_players: room.max_players,
        isPlayerHost: true,
      });
    } catch (e) {
      return res.status(400).json({ message: e });
    }
  });

  app.delete("/api/room", check_auth, function (req, res) {
    logger_http.info("[DELETE] /api/room");

    res.setHeader("Content-Type", "application/json");
    const data = req.body;
    const room_id = data.room_id;

    const room = getRoomById(room_id);
    if (!room)
      return res
        .status(404)
        .json({ message: "Impossible de supprimer le salon." });

    if (room.owner_id != req.user.id)
      return res
        .status(401)
        .json({ message: "Vous n'êtes pas l'hôte du salon." });

    deleteRoom(room_id);

    res.status(200).json({ message: "Salon supprimé." });
  });
};
