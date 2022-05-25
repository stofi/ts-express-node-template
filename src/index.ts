import 'dotenv/config'
import * as express from "express";
import * as http from "http";
import {Configuration, OpenAIApi} from "openai"
import bodyParser from "body-parser";

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);
const app = express.default();

app.use(bodyParser.json());

app.get("/", (_req, res) => {
    console.info("Request received")
    res.send({ uptime: process.uptime() });
});


app.get("/api/v1/predict", async (req, res) => {
    console.info("Request received")
    const { text } = req.query;
    if(!text) {
        res.status(400).send({ error: "text is required" });
        console.error("text is required")
        return;
    }
    if(typeof text !== "string") {
        res.status(400).send({ error: "text must be a string" });
        console.error("text must be a string")
        return;
    }
    try {
        const response = await openai.createCompletion("text-davinci-002", {
            prompt: `Question: ${text}
Answer: `,
            temperature: 0.8,
            max_tokens: 280,
        }).then(({ data }) => data);
        
        if(!response.choices || !response.choices.length) {
            res.status(500).send({ error: "no choices" });
            console.error("no choices")
            return;
        }
        const choice = response.choices[0];
        res.send({
            question: text,
            ...choice,
        });
    } catch (e) {
        console.error(e)
        res.send(e);
    }
});

const server = http.createServer(app);



server.listen(4040, () => {
    console.info("Server started")
});
