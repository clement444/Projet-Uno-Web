import { check_auth } from "../../middleware/auth";
import { app } from "../../index";
import { logger_http } from "../../utils/logger";
import { createRoom, getAllRooms } from "../../controllers/api/room";

export default () => {
  app.get("/api/room", check_auth, function (_, res) {
    logger_http.info("[GET] /api/room");
    res.json(getAllRooms());
  });

  app.post("/api/room", check_auth, function (req, res) {
    logger_http.info("[POST] /api/room");
    const { name, max_players } = req.body;
    if (!name) return res.status(400).json({ error: "Nom de room requis" });
    const existing = getAllRooms().find((r) => r.name === name);
    if (existing) return res.status(409).json({ error: "Une room avec ce nom existe déjà" });
    const room = createRoom(req.user.user_id, name, max_players || 4);
    if (!room) return res.status(500).json({ error: "Erreur lors de la création de la room" });
    res.status(201).json({ id: room.id, name: room.name });
  });
};
