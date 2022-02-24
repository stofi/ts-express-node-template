import * as express from "express";
import * as http from "http";
import * as socketio from "socket.io";
import uuid from "uuid";

import SheepServer from "./server";

const app = express.default();


app.get("/", (_req, res) => {
  res.send({ uptime: process.uptime() });
});

const server = http.createServer(app);
const io = new socketio.Server(server, {
  cors: {
    origin: '*'
  }
});

const sheep = new SheepServer(io);




server.listen(4004, () => {
  console.log("Running at localhost:4004");
});
