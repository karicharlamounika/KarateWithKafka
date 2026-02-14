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

const SECRET_KEY = process.env.AUTH_SECRET_KEY || "auth-secret-key";

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

// Register new user
app.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare(
      "INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)"
    );
    stmt.run(firstName, lastName, email, hashedPassword, function (err) {
      if (err) {
        return res.status(409).json({ error: "User already exists" });
      }
      res.status(201).json({ message: "User registered successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Login user
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
      expiresIn: "1h",
    });

    res.status(200).json({ token });
  });
});

app.listen(PORT, () =>
  console.log(`🔐 Auth Service running on http://localhost:${PORT}`)
);