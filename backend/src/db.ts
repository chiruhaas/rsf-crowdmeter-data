import "dotenv/config";
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST,
  user: "postgres",
  password: process.env.DB_PASSWORD,
  database: "rsf",
});

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS crowd_data (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP,
        total_current_count INTEGER,
        total_capacity INTEGER,
        total_percent DOUBLE PRECISION,
        main_room_current_count INTEGER,
        main_room_capacity INTEGER,
        annex_room_current_count INTEGER,
        annex_room_capacity INTEGER,
        extension_room_current_count INTEGER,
        extension_room_capacity INTEGER
        )
    `);
}

initDB();