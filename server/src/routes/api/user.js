import { check_auth } from "../../middleware/auth";
import { app } from "../../index";
import { createUser } from "../../controllers/api/user";

export default () => {
  app.get("/api/user", check_auth, function (req, res) {
    res.setHeader("Content-Type", "application/json");
    const user = res.locals.user;

    if (!user) {
      res.statusCode = 400;
      res.json({
        message: "You are not logged in.",
      });
    } else {
      res.json(user);
    }
  });

  app.post("/api/user", function (req, res) {
    res.setHeader("Content-Type", "application/json");
    const data = req.body;
    const username = data.username;
    const password = data.password;

    if (typeof username != String || typeof password != String) {
      res.statusCode = 400;
      res.json({
        message: "Provided data is malformed.",
      });
      return;
    }

    if (username == undefined || username.trim() == "") {
      res.statusCode = 400;
      res.json({
        message: "No username provided.",
      });
      return;
    }

    if (username == undefined || password.trim() == "") {
      res.statusCode = 400;
      res.json({
        message: "No password provided.",
      });
      return;
    }

    createUser(username, password);
  });

  app.delete("/api/user", check_auth, function (req, res) {
    res.setHeader("Content-Type", "application/json");
    const data = req.body;
    const user_id = data.user_id;
    const user = res.locals.user;

    if (typeof user_id != String) {
      res.statusCode = 400;
      res.json({
        message: "Provided data is malformed.",
      });
      return;
    }

    if (username == undefined ) {
      res.statusCode = 400;
      res.json({
        message: "No username provided.",
      });
      return;
    }

    if (!user) {
      res.statusCode = 400;
      res.json({
        message: "You are not logged in.",
      });
    } else {
      res.json(user);
    }
  });
};
