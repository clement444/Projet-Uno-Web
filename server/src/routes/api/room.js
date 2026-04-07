import { check_auth } from "../../middleware/auth";
import { app } from "../../index";

export default () => {
  app.get("/api/room", check_auth, function (req, res, user) {
    res.setHeader("Content-Type", "application/json");
    const room_id = req.query.id;

    if (room_id) {
      res.json({ message: `Show room id # ${room_id}` });
    } else {
      res.json({ message: "ALL ROOMS" });
    }
  });

  app.post("/api/room", check_auth, function (req, res, user) {
    res.setHeader("Content-Type", "application/json");
    const data = req.body;

    if (data.join_id) {
      const room_id = data.join_id;
      // join room
    } else {
      const name = data.name;
      const max_players = data.max_players;

      // create a new room
    }
  });

  app.delete("/api/room", check_auth, function (req, res, user) {
    res.setHeader("Content-Type", "application/json");
    const data = req.body;
    const room_id = data.room_id;

    // delete a room
  });
};
