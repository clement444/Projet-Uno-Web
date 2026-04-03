import express from "express";
import Logger from "logpleaser";
import path from "path";
import routes from "./middleware/routes";
import db from "./utils/db.js";

const app = express();
const logger_main = Logger.create("main");
const port = 3000;

app.use("/src", express.static(path.join(__dirname, "../../client/public")));

// Init routes
routes(app);

app.listen(port, () => {
  logger_main.info(`Application uno started on port ${port}`);
});
