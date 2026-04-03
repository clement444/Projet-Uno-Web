import express from "express";
import Logger from "logpleaser";

const app = express();
const logger = Logger.create("main");
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  logger.info(`Application uno started on port ${port}`);
});
