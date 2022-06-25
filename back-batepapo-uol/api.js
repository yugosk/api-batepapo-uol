import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());

let db = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);

server.post("/participants", (req, res) => {
    const newUser = req.body.name;
    try {
        await mongoClient.connect();
        db = mongoClient.db("participants");
        const loginTry = db.find({ name: newUser });
        
        db.insert({ name: newUser });

    } catch {

    }

})

server.listen(5000);
