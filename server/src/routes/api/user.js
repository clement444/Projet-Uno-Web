import { logger_http } from "../../utils/logger";
import { app } from "../../index";
import { createUser, getUser, loginUser } from "../../controllers/api/user";
import { check_auth } from "../../middleware/auth";

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

  app.get("/api/me", check_auth, async (req, res) => {
    const logged_user = req.user;
    const user = await getUser(logged_user.id);
    if (!user) return res.status(404).json({ message: null });

    return res.status(200).json({ id: user.id, username: user.username });
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
