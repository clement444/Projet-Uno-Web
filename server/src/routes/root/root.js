import path from "path";
import { logger_http } from "../../utils/logger";
import { app } from "../../index";

export default () => {
  app.get("/", (req, res) => {
    logger_http.info("[GET] /");
    res.sendFile(path.join(__dirname, "../../../../client/src/views/index.html"));
  });

  app.get("/lobby", (req, res) => {
    logger_http.info("[GET] /lobby");
    res.sendFile(path.join(__dirname, "../../../../client/src/views/lobby/lobby.html"));
  });

  app.get("/room", (req, res) => {
    logger_http.info("[GET] /room");
    res.sendFile(path.join(__dirname, "../../../../client/src/views/room/room.html"));
  });

  app.get("/game", (req, res) => {
    logger_http.info("[GET] /game");
    res.sendFile(path.join(__dirname, "../../../../client/src/views/game/game.html"));
  });
};
