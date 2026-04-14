import { logger_http } from "../../utils/logger";
import { app } from "../../index";
import { createUser, loginUser } from "../../controllers/api/user";

export default () => {
  app.post("/api/register", (req, res) => {
    logger_http.info("[POST] /api/register");

    try {
      const response = createUser(req.body.username, req.body.password);
      res.status(response.status_code).json({ token: response.token });
    } catch (e) {
      res.status(e.status_code).json({ message: e.message });
    }
  });

  app.post("/api/login", (req, res) => {
    logger_http.info("[POST] /api/login");

    try {
      const response = loginUser(req.body.username, req.body.password);
      res.status(response.status_code).json({ token: response.token });
    } catch (e) {
      res.status(e.status_code).json({ message: e.message });
    }
  });
};
