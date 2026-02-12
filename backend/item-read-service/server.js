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

// Health check
app.get("/health", (req, res) => res.sendStatus(200));

// GET /items endpoint
app.get("/items", (req, res) => {
  db.all("SELECT * FROM items", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start HTTP server
app.listen(PORT, () =>
  console.log(`📖 Read-service running on http://localhost:${PORT}`)
);
