const { Pool } = require("pg");

if (!process.env.ITEMS_WRITE_DB_URL) {
  throw new Error("❌ ITEMS_WRITE_DB_URL environment variable is required");
}

const db = new Pool({
  connectionString: process.env.ITEMS_WRITE_DB_URL,
});

db.query(`
  CREATE TABLE IF NOT EXISTS items (
    itemId         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    quantity   INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).then(() => console.log("✅ Connected to PostgreSQL — items table ready"))
  .catch(err => {
    console.error("❌ Failed to connect to items DB", err);
    process.exit(1);
  });

module.exports = db;
