import "dotenv/config";

interface CrowdInfo {
    currentCount: number;
    capacity: number;
    percent: number;
}

async function fetchCrowdData() {
    const requestUrl = "https://api.density.io/v2/spaces"

    const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.DENSITY_TOKEN}`
        }
    });

    if (!response.ok) {
        throw new Error(`Error status: ${response.status}, Error message: ${await response.text}`);
    }

    const data = await response.json();
    console.log(data);

    const results = data.results;

    const info: CrowdInfo[] = results.map((r: any) => ({
        currentCount: r.current_count,
        capacity: r.capacity,
        percent: Math.ceil((r.current_count / r.capacity) * 100),
    }));
    console.log(info)

    return info;
}
