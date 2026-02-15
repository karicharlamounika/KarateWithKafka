const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// DB file inside service folder
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, "items_read.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Failed to connect to items DB", err);
  } else {
    console.log("✅ Connected to items SQLite DB");
  }
});

// Create items table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;
