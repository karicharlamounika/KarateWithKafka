const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"]
}));

const PORT = 6000;

app.get("/health", (req, res) => res.sendStatus(200));

// GET /items
app.get("/items", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM items");
    res.status(200).json(rows);

  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () =>
  console.log(`📖 Read-service running on http://localhost:${PORT}`)
);