import path from "path";
import { logger_http } from "../../utils/logger";
import { app } from "../../index";

export default () => {
  app.get("/", (req, res) => {
    logger_http.info("[GET] /");
    res.sendFile(
      path.join(__dirname, "../../../../client/src/views/index.html"),
    );
  });
};
