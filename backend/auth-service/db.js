const { Pool } = require("pg");

if (!process.env.AUTH_DB_URL) {
  throw new Error("❌ AUTH_DB_URL environment variable is required");
}

const db = new Pool({
  connectionString: process.env.AUTH_DB_URL,
});

db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    firstName  TEXT NOT NULL,
    lastName   TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => console.log("✅ Connected to PostgreSQL — users table ready"))
  .catch(err => {
    console.error("❌ Failed to connect to auth DB", err);
    process.exit(1);
  });

module.exports = db;