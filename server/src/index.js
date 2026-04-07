import express from "express";
import path from "path";
import init_routes from "./routes/init_routes";
import { logger_main } from "./utils/logger";
import db from "./utils/db";

export const app = express();
const port = 3000;

app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "../../client/public")));

// Init routes
init_routes();

app.listen(port, () => {
  logger_main.info(`Application uno started on port ${port}`);
});
