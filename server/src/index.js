import express from "express";
import path from "path";
import init_routes from "./routes/init_routes";
import { logger_main } from "./utils/logger";
import { createWebSocketServer } from "./controllers/websocket/websocket_server";

export const app = express();
const port = 3000;

app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "../../client/public")));
app.use("/views", express.static(path.join(__dirname, "../../client/src/views")));

init_routes();

app.use((err, _req, res, _next) => {
  res.status(500).json({ message: "Internal Server Error" });
});

const httpServer = app.listen(port, () => {
  logger_main.info(`Application uno started on port ${port}`);
});

createWebSocketServer(httpServer);
