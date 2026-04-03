import express from "express";
import Logger from "logpleaser";
import path from "path";

const app = express();
const logger_main = Logger.create("main");
const logger_http = Logger.create("http");
const port = 3000;

app.use("/src", express.static(path.join(__dirname, "../../client/public")));

app.get("/", (req, res) => {
  logger_http.info("[GET] /");
  res.sendFile(path.join(__dirname, "../../client/html/index.html"));
});

app.get("/api", (req, res) => {
  logger_http.info("[GET] /api");
  res.sendFile(path.join(__dirname, "./docs/api/info.txt"));
});

app.listen(port, () => {
  logger_main.info(`Application uno started on port ${port}`);
});
