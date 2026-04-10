import { logger_http } from "../../utils/logger";
import { app } from "../../index";
import { createUser, loginUser } from "../../controllers/api/user";

export default () => {
  app.post("/api/register", (req, res) => {
    logger_http.info("[POST] /api/register");
    createUser(req, res);
  });

  app.post("/api/login", (req, res) => {
    logger_http.info("[POST] /api/login");
    loginUser(req, res);
  });
};
