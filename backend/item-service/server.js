const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { connectProducer, publishEvent } = require("./kafkaProducer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 5000;
const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY || "auth-secret-key";

// Connect Kafka Producer
connectProducer().catch(console.error);

// Health check
app.get("/health", (req, res) => {
  res.sendStatus(200);
});

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ message: "Access token missing" });

  jwt.verify(token, AUTH_SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
}

// Create item
app.post("/items", authenticateToken, async (req, res) => {
  const { name, quantity } = req.body;

  if (!name || !quantity) {
    return res.status(400).json({ error: "Name and quantity required" });
  }

  await publishEvent("ITEM_CREATED", {
    name,
    quantity,
    userId: req.user.id,
  });

  res.status(202).json({ message: "Item creation queued" });
});

// Update item
app.put("/items/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, quantity } = req.body;

  await publishEvent("ITEM_UPDATED", {
    id: parseInt(id),
    name,
    quantity,
    userId: req.user.id,
  });

  res.status(202).json({ message: "Item update queued" });
});

// Delete item
app.delete("/items/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  await publishEvent("ITEM_DELETED", {
    id: parseInt(id),
    userId: req.user.id,
  });

  res.status(202).json({ message: "Item deletion queued" });
});

// Start server
app.listen(PORT, () =>
  console.log(`📦 Item Service running on http://localhost:${PORT}`)
);
