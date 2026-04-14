import { logger_http } from "../../utils/logger";
import { app } from "../../index";
import { createUser, loginUser } from "../../controllers/api/user";

export default () => {
  app.post("/api/register", async (req, res) => {
    logger_http.info("[POST] /api/register");

    try {
      const response = await createUser(req.body.username, req.body.password);
      res.status(response.status_code).json({ token: response.token });
    } catch (e) {
      const err = JSON.parse(e.message);
      res.status(err.status_code).json({ message: err.message });
    }
  });

  app.post("/api/login", async (req, res) => {
    logger_http.info("[POST] /api/login");

    try {
      const response = await loginUser(req.body.username, req.body.password);
      res.status(response.status_code).json({ token: response.token });
    } catch (e) {
      const err = JSON.parse(e.message);
      res.status(err.status_code).json({ message: err.message });
    }
  });
};
