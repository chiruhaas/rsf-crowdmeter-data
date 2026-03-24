import { CrowdInfo } from "./scraper";
import { pool } from "./db";

export async function saveToDB(info: CrowdInfo[]) {
    if (info.length < 4) {
        throw new Error("Expected 4 crowd entries");
    }

    const [total, main, extension, annex] = info as [CrowdInfo, CrowdInfo, CrowdInfo, CrowdInfo];
    const timestamp = new Date().toISOString();

    await pool.query(
        `INSERT INTO crowd_data (
            timestamp,
            total_current_count,
            total_capacity,
            total_percent,
            main_room_current_count,
            main_room_capacity,
            annex_room_current_count,
            annex_room_capacity,
            extension_room_current_count,
            extension_room_capacity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
            timestamp,
            total.currentCount, total.capacity, total.percent,
            main.currentCount, main.capacity,
            annex.currentCount, annex.capacity,
            extension.currentCount, extension.capacity,
        ]
    );
}
