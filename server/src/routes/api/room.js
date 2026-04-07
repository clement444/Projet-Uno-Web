import { check_auth } from "../../middleware/auth";
import { app } from "../../index";

export default () => {
  app.get("/api/room", check_auth, function (req, res) {});
};
