import db from "./db";
import { CrowdInfo } from "./scraper";

export function saveToDB(info: CrowdInfo[]) {
    const stmt = db.prepare(`
        INSERT INTO crowd_data (
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
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const timestamp = new Date().toISOString();

    if (info.length < 4) {
        throw new Error("Expected 4 crowd entries");
    }

    const [total, main, annex, extension] = info as [CrowdInfo, CrowdInfo, CrowdInfo, CrowdInfo];

    stmt.run(timestamp, total.currentCount, total.capacity, total.percent, main.currentCount, main.capacity, annex.currentCount, annex.capacity, extension.currentCount, extension.capacity);
}