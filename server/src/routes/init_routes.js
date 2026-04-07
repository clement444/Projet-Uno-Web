import { app } from "../index";

// Routes
import http_root from "./root/root";
import api_root from "./api/root";
import api_room from "./api/room";

export default () => {
  // Root
  http_root();

  // API
  api_root();
  api_room();
};
