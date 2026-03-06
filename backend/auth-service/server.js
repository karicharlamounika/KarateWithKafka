const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 4000;

if (!process.env.AUTH_SECRET_KEY) {
  throw new Error("❌ AUTH_SECRET_KEY environment variable is required");
}
const SECRET_KEY = process.env.AUTH_SECRET_KEY;

app.get("/health", (req, res) => res.sendStatus(200));

// Register
app.post("/register", async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await db.query(
      "INSERT INTO users (firstName, lastName, email, password) VALUES ($1, $2, $3, $4) RETURNING id, firstName, lastName, email",
      [firstName, lastName, email, hashedPassword]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: rows[0],
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "User already exists" });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const { rows } = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = rows[0];

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
      expiresIn: "1h",
    });

    res.status(200).json({ token });

  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () =>
  console.log(`🔐 Auth Service running on http://localhost:${PORT}`)
);