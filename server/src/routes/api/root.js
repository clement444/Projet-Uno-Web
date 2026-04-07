import path from "path";
import { logger_http } from "../../utils/logger";
import { app } from "../../index";

export default () => {
  app.get("/api", (req, res) => {
    logger_http.info("[GET] /api");
    res.sendFile(path.join(__dirname, "../../docs/api/info.txt"));
  });
};
