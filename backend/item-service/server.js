const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { connectProducer, publishEvent } = require("./kafkaProducer");
const { nanoid } = require("nanoid");
const db = require("./db");
const itemsDb = require("./itemsDb");

const app = express();
app.use(cors());
app.use(bodyParser.json());


const PORT = 5000;
if (!process.env.AUTH_SECRET_KEY) {
  throw new Error("❌ AUTH_SECRET_KEY environment variable is required");
}
const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY;

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

  if (!req.body) {
    return res.status(400).json({ error: "Name and quantity required" });
  }
  const { name, quantity } = req.body;


  if (!name || name.trim() === '' || !quantity || quantity <= 0 || typeof quantity !== 'number') {
    return res.status(400).json({ error: "Name and quantity required" });
  }

  const itemId = `item_${nanoid(10)}`;
  const correlationId = `req_${nanoid(10)}`;

  await db.query(
    "INSERT INTO job_status (correlation_id, item_id, name, quantity, status) VALUES ($1, $2, $3, $4, 'PENDING')",
    [correlationId, itemId, name, quantity]
  );

  await publishEvent("ITEM_CREATED", {
    itemId,
    correlationId,
    name,
    quantity,
    userId: req.user.id,
  });

  res.status(202).json({
    message: "Item creation queued", correlationId,
    statusUrl: `/items/${correlationId}/status`,
    item: {
      itemId,
      name,
      quantity,
      status: "PENDING",
    },

  });
});


// ─── Status Check (Polling Endpoint) ──────────────────────────────────────────
app.get("/items/:correlationId/status", authenticateToken, async (req, res) => {
  const { correlationId } = req.params;

  const { rows } = await db.query(
    "SELECT * FROM job_status WHERE correlation_id = $1",
    [correlationId]
  );
  const job = rows[0];

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  return res.status(200).json({
    correlationId,
    status: job.status,  // now dynamic!
    completed: job.status === "COMPLETED"
      ? { itemId: job.item_id, name: job.name, quantity: job.quantity }
      : null,
    processing: job.status === "PROCESSING"
      ? { message: "Your item is being processed", startedAt: job.updated_at }
      : null,
    error: job.status === "FAILED"
      ? { message: job.error_message }
      : null,
  });
});

// Update item
app.put("/items/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (!req.body) {
    return res.status(400).json({ error: "Name and quantity required" });
  }
  const { name, quantity } = req.body;


  if (!name || name.trim() === '' || !quantity || quantity <= 0 || typeof quantity !== 'number') {
    return res.status(400).json({ error: "Name and quantity required" });
  }
  const correlationId = `req_${nanoid(10)}`;

  // Write PENDING to DB before publishing
  await db.query(
    "INSERT INTO job_status (correlation_id, item_id, name, quantity, status) VALUES ($1, $2, $3, $4, 'PENDING')",
    [correlationId, id, name, quantity]
  );


  await publishEvent("ITEM_UPDATED", {
    itemId: id,
    correlationId,
    name,
    quantity,
    userId: req.user.id,
  });

  res.status(202).json({
    message: "Item update queued", correlationId,
    statusUrl: `/items/${correlationId}/status`,
    item: { itemId: id, name, quantity, status: "PENDING" },

  });
});

// Delete item
app.delete("/items/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const correlationId = `req_${nanoid(10)}`;

  // Check if item exists before queuing deletion

  const { rows } = await itemsDb.query(
    "SELECT * FROM items WHERE itemId = $1'",
    [id]
  );
  const item = rows[0];

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  // Write PENDING to job_status before publishing
  await db.query(
    "INSERT INTO job_status (correlation_id, item_id, name, quantity, status) VALUES ($1, $2, $3, $4, 'PENDING')",
    [correlationId, id, item.name, item.quantity]
  );

  await publishEvent("ITEM_DELETED", {
    itemId: id,
    name: item.name,
    quantity: item.quantity,
    correlationId,
    userId: req.user.id,
  });

  return res.status(202).json({
    message: "Item deletion queued",
    correlationId,
    statusUrl: `/items/${correlationId}/status`,
    item: { itemId: id, name: item.name, quantity: item.quantity, status: "PENDING" },
  });
});

// Start server
app.listen(PORT, () =>
  console.log(`📦 Item Service running on http://localhost:${PORT}`)
);
