const express = require("express");
const proxy = require("http-proxy-middleware");

const app = express();

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:4000";

const ITEM_SERVICE_URL =
  process.env.ITEM_SERVICE_URL || "http://localhost:5000";

const READ_SERVICE_URL =
  process.env.ITEM_READ_SERVICE_URL || "http://localhost:6000";


app.use(
  "/auth",
  proxy.createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true
  })
);

app.use(
  "/items",
  (req, res, next) => {
    if (req.method === "GET") {
      return proxy.createProxyMiddleware({
        target: ITEM_READ_SERVICE_URL,
        changeOrigin: true
      })(req, res, next);
    }
    return proxy.createProxyMiddleware({
      target: ITEM_SERVICE_URL,
      changeOrigin: true
    })(req, res, next);
  }
);

app.listen(8080, () =>
  console.log("API Gateway running on port 8080")
);
