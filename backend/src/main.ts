import { fetchCrowdData, isRSFOpen } from "./scraper";
import { saveToDB } from "./storage";

async function main() {
    if (!isRSFOpen()) {
        console.log("RSF closed — skipping");
        process.exit(0);
    }
    try {
        const data = await fetchCrowdData();
        await saveToDB(data);

        console.log("Saved to DB");
    } catch (err) {
        console.error("Pipeline Failed:", err);
    }
}

main();