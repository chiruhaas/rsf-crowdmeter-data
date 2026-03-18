import Database from "better-sqlite3";

const db: Database.Database = new Database("rsf.db")
db.prepare(`
  CREATE TABLE IF NOT EXISTS crowd_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME,
    total_current_count INTEGER,
    total_capacity INTEGER,
    total_percent REAL,
    main_room_current_count INTEGER,
    main_room_capacity INTEGER,
    annex_room_current_count INTEGER,
    annex_room_capacity INTEGER,
    extension_room_current_count INTEGER,
    extension_room_capacity INTEGER
  )
`).run();

export default db;