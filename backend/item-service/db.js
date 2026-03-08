const { Pool } = require("pg");

if (!process.env.JOB_STATUS_DB_URL) {
  throw new Error("❌ JOB_STATUS_DB_URL environment variable is required");
}

const db = new Pool({
  connectionString: process.env.JOB_STATUS_DB_URL,
});

db.query(`
  CREATE TABLE IF NOT EXISTS job_status (
    id             SERIAL PRIMARY KEY,
    correlation_id TEXT      UNIQUE NOT NULL,
    item_id        TEXT      NOT NULL,
    name           TEXT      NOT NULL,
    quantity       INTEGER   NOT NULL,
    status         TEXT      NOT NULL DEFAULT 'PENDING',
    error_message  TEXT,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
  )
`).then(() => console.log("✅ Connected to PostgreSQL — job_status table ready"))
  .catch(err => {
    console.error("❌ Failed to connect to job_status DB", err);
    process.exit(1);
  });

module.exports = db;
