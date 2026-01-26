const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "items_read.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Failed to connect to read DB", err);
  else console.log("✅ Connected to read SQLite DB");
});

// Create table
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
