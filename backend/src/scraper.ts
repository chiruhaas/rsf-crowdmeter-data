import "dotenv/config";

export interface CrowdInfo {
    currentCount: number;
    capacity: number;
    percent: number;
}

export async function fetchCrowdData() {
    const requestUrl = "https://api.density.io/v2/spaces"

    const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.DensityToken}`
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

export function isRSFOpen(): boolean {
    const pst = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const hour = pst.getHours();
    const day = pst.getDay();

    if (day >= 1 && day <= 5) {
        return hour >= 7 && hour < 23;
    }

    // Saturday hours
    if (day === 6) {
        return hour >= 8 && hour < 18;
    }

    // Sunday hours
    if (day === 0) {
        return hour >= 8 && hour < 23;
    }

    return false;
}
