require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  LexRuntimeV2Client,
  RecognizeTextCommand,
} = require("@aws-sdk/client-lex-runtime-v2");

const analyticsRoutes = require("./routes/analytics");
const feedbackRoutes = require("./routes/feedback");
const servicesRoutes = require("./routes/services");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Analytics, Feedback, Services routes (Member 5)
app.use("/api/analytics", analyticsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/services", servicesRoutes);

// Chatbot route - proxies to AWS Lex (Member 3)
const lexClient = new LexRuntimeV2Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`SAWS backend running on http://localhost:${PORT}`);
});
