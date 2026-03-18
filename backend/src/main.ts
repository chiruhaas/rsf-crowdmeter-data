import { fetchCrowdData } from "./scraper";
import { saveToDB } from "./storage";

async function main() {
    try {
        const data = await fetchCrowdData();
        saveToDB(data);

        console.log("Saved to DB");
    } catch (err) {
        console.error(err);
    }
}

main();