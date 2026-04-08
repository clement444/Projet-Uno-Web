import express from "express";
import path from "path";
import init_routes from "./routes/init_routes";
import { logger_main } from "./utils/logger";
import db from "./utils/db";
import { createWebSocketServer } from "./controllers/websocket/websocket_server";

export const app = express();
const port = 3000;

app.use("/public", express.static(path.join(__dirname, "../../client/public")));

init_routes();

const httpServer = app.listen(port, () => {
  logger_main.info(`Application uno started on port ${port}`);
});

createWebSocketServer(httpServer);
