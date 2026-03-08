const { Pool } = require("pg");

if (!process.env.ITEMS_WRITE_DB_URL) {
  throw new Error("❌ ITEMS_WRITE_DB_URL environment variable is required");
}

const itemsDb = new Pool({
  connectionString: process.env.ITEMS_WRITE_DB_URL,
});

module.exports = itemsDb;