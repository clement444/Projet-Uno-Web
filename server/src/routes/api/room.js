import { check_auth } from "../../middleware/auth";
import { app } from "../../index";
import { logger_http } from "../../utils/logger";
import { newRoom } from "../../controllers/api/room";
import { rooms } from "../../../data/game_data";

export default () => {
  app.get("/api/room", check_auth, function (req, res) {
    logger_http.info("[GET] /api/room");
    const list = rooms.map((r) => ({
      id: r.id,
      name: r.name,
      players: r.players.length,
      max_players: r.max_players,
    }));
    res.json(list);
  });

  app.post("/api/room", check_auth, function (req, res) {
    logger_http.info("[POST] /api/room");
    const { name, max_players } = req.body;
    if (!name) return res.status(400).json({ error: "Nom de room requis" });
    if (rooms.find((r) => r.name === name)) return res.status(409).json({ error: "Une room avec ce nom existe déjà" });
    const id = crypto.randomUUID();
    newRoom(id, name, max_players || 4);
    res.status(201).json({ id, name });
  });
};
