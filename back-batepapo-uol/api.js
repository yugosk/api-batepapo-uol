import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import joi from "joi";
import { stripHtml } from "string-strip-html";
import dayjs from "dayjs";

dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());

const TIME_10S = 10000;
const TIME_15S = 15000;

const mongoClient = new MongoClient(process.env.MONGO_URI);

await mongoClient.connect();
let db = mongoClient.db("api-batepapo-uol");

const participantSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.valid("message", "private_message"),
});

server.post("/participants", async (req, res) => {
  const newUser = req.body;
  const validation = participantSchema.validate(newUser);
  if (validation.error) {
    res.status(422).send(validation.error.details);
  }

  const findUser = await db.collection("participants").findOne(newUser);
  if (findUser) {
    res.status(409).send("Usuário já cadastrado");
  }

  try {
    db.collection("participants").insertOne({
      name: stripHtml(user.name.trim()).result,
      lastStatus: Date.now(),
    });
    db.collection("messages").insertOne({
      from: stripHtml(user.name.trim()).result,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:MM:ss"),
    });
    res.status(201).send("Cadastro realizado com sucesso!");
  } catch {
    res.status(500).send("Um erro foi encontrado, tente novamente!");
  }
});

server.get("/participants", async (req, res) => {
  const userList = await db.collection("participants").find({}).toArray();
  res.send(userList);
});

server.post("/messages", async (req, res) => {
  const messageContent = req.body;
  const messageSender = req.headers.user;
  const validation = messageSchema.validate(messageContent, {
    abortEarly: false,
  });

  if (validation.error) {
    res.status(422).send(validation.error.details);
  }

  const findUser = await db
    .collection("participants")
    .findOne({ name: messageSender });
  if (!findUser) {
    res
      .status(422)
      .send("Destinatário não encontrado, cheque os dados e tente novamente!");
  }

  try {
    db.collection("messages").insertOne({
      from: messageSender,
      text: stripHtml(messageContent.text).result,
      type: messageContent.type.trim(),
      time: dayjs().format("HH:MM:ss"),
    });
    res.status(201).send("Mensagem enviada com sucesso!");
  } catch {
    res.status(500).send("Um erro foi encontrado, tente novamente!");
  }
});

server.get("/messages", async (res, req) => {
  function getPrivateMessages(message) {
    if (message.type !== "private_message") {
      return true;
    } else if (message.from === user || message.to === user) {
      return true;
    } else {
      return false;
    }
  }

  const messageLimit = req.query;
  const user = req.headers.user;
  const messages = await db.collection("messages").find({}).toArray();
  if (messageLimit) {
    res
      .status(200)
      .send(
        messages
          .slice(-messageLimit)
          .filter((message) => getPrivateMessages(message))
      );
  } else {
    res
      .status(200)
      .send(messages.filter((message) => getPrivateMessages(message)));
  }
});

server.post("/status", async (req, res) => {
  const user = req.headers.user;
  const findUser = await db.collection("participants").findOne({ name: user });
  if (!findUser) {
    res.status(404).send("Usuário não encontrado!");
  }

  db.collection("participants").updateOne(
    { name: user },
    {
      $set: { lastStatus: Date.now() },
    }
  );
  res.status(200).send("Status do usuário atualizado com sucesso!");
});

setInterval(async () => {
  const activeUsersList = await db
    .collection("participants")
    .find({})
    .toArray();
  const now = Date.now();
  for (let i = 0; i < activeUsersList.length; i++) {
    if (now - activeUsersList[i].lastStatus >= TIME_10S) {
      db.collection("participants").deleteOne({
        name: activeUsersList[i].name,
      });
      db.collection("messages").insertOne({
        from: activeUsersList[i].name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: dayjs().format("HH:MM:ss"),
      });
    }
  }
}, TIME_15S);

server.listen(5000);
