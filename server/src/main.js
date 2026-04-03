import express from "express";
import Logger from "logpleaser";
import path from "path";

const app = express();
const logger = Logger.create("main");
const port = 3000;

app.use("/src", express.static(path.join(__dirname, "../../client/public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../client/html/index.html"));
});

app.listen(port, () => {
  logger.info(`Application uno started on port ${port}`);
});
