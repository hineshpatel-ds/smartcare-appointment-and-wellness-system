require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  LexRuntimeV2Client,
  RecognizeTextCommand,
} = require("@aws-sdk/client-lex-runtime-v2");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const lexClient = new LexRuntimeV2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.get("/", (req, res) => {
  res.send("SAWS backend is running");
});

app.post("/api/chatbot/message", async (req, res) => {
  const { message, sessionId } = req.body;

  try {
    const command = new RecognizeTextCommand({
      botId: process.env.LEX_BOT_ID,
      botAliasId: process.env.LEX_BOT_ALIAS_ID,
      localeId: process.env.LEX_LOCALE_ID || "en_US",
      sessionId: sessionId || "default-user-session",
      text: message,
    });

    const lexResponse = await lexClient.send(command);

    const reply =
      lexResponse.messages && lexResponse.messages.length > 0
        ? lexResponse.messages.map((msg) => msg.content).join(" ")
        : "Sorry, I could not understand your request.";

    res.json({ reply });
  } catch (error) {
    console.error("Lex error:", error);
    res.status(500).json({
      reply: "Chatbot service is currently unavailable.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});