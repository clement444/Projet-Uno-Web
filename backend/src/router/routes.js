import middlewares from "../middlewares/auth";
import Logger from "logpleaser";
import path from "path";

const logger_http = Logger.create("http");

export default (app) => {
  app.get("/", (req, res) => {
    logger_http.info("[GET] /");
    res.sendFile(path.join(__dirname, "../../../client/html/index.html"));
  });

  app.get("/api", (req, res) => {
    logger_http.info("[GET] /api");
    res.sendFile(path.join(__dirname, "../docs/api/info.txt"));
  });

  app.get("/api/room", middlewares.check_auth, function (req, res) {});
};
