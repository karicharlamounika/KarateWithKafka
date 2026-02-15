const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"]
}));

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4000";
const ITEM_SERVICE_URL = process.env.ITEM_SERVICE_URL || "http://localhost:5000";
const ITEM_READ_SERVICE_URL = process.env.ITEM_READ_SERVICE_URL || "http://localhost:6000";

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create proxies once
const authProxy = createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  logLevel: "debug"
});

const itemWriteProxy = createProxyMiddleware({
  target: ITEM_SERVICE_URL,
  changeOrigin: true,
  logLevel: "debug"
});

const itemReadProxy = createProxyMiddleware({
  target: ITEM_READ_SERVICE_URL,
  changeOrigin: true,
  logLevel: "debug"
});

// Auth routes
app.use("/auth", authProxy);

// Item routes - explicit method routing
app.get("/items*", itemReadProxy);
app.post("/items*", itemWriteProxy);
app.put("/items*", itemWriteProxy);
app.delete("/items*", itemWriteProxy);

app.listen(8080, () => {
  console.log("========================================");
  console.log("API Gateway running on port 8080");
  console.log(`  /auth -> ${AUTH_SERVICE_URL}`);
  console.log(`  /items (GET) -> ${ITEM_READ_SERVICE_URL}`);
  console.log(`  /items (POST/PUT/DELETE) -> ${ITEM_SERVICE_URL}`);
  console.log("========================================");
});