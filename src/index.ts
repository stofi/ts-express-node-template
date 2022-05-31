import 'dotenv/config'
import * as express from "express";
import * as http from "http";
import bodyParser from "body-parser";

const app = express.default();

app.use(bodyParser.json());

app.get("/", (_req, res) => {
    console.info("Request received")
    res.send({ uptime: process.uptime() });
});


const server = http.createServer(app);



server.listen(4040, () => {
    console.info("Server started")
});
