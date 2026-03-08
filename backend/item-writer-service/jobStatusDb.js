const { Pool } = require("pg");

if (!process.env.JOB_STATUS_DB_URL) {
  throw new Error("❌ JOB_STATUS_DB_URL environment variable is required");
}

const jobStatusDb = new Pool({
  connectionString: process.env.JOB_STATUS_DB_URL,
});

module.exports = jobStatusDb;