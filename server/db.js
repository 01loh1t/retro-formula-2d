// PostgreSQL connection pool and the small helpers used by the route files.

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
}

// Hosted Postgres providers (Neon, Render, Supabase, Railway) require SSL.
// A local database normally does not, so SSL is only switched on for remote hosts.
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000
});

pool.on("error", (err) => {
    console.error("Unexpected database error:", err.message);
});

// Runs a single SQL statement. Always use $1, $2 placeholders for values -
// never build SQL by joining strings, or the query becomes open to SQL injection.
function query(text, params) {
    return pool.query(text, params);
}

// Runs schema.sql. Every statement uses IF NOT EXISTS, so this is safe on every boot.
async function initSchema() {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    await pool.query(schema);
    console.log("Database schema is ready.");
}

module.exports = { pool, query, initSchema };
