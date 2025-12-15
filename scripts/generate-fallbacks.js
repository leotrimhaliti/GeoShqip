const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Read .env.local
let token = process.env.MAPILLARY_TOKEN;
if (!token) {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/MAPILLARY_TOKEN=(.+)/);
        if (match) {
            token = match[1].trim();
            console.log("Token found in .env.local");
        }
    } catch (e) {
        console.log("Could not read .env.local", e.message);
    }
}

if (!token) {
    console.error("No token found. Make sure MAPILLARY_TOKEN is set.");
    process.exit(1);
}

// 2. Logic
const SEARCH_BOX_SIZE_DEG = 0.1;
const BOUNDS = [
    { name: "XK", west: 20.0, south: 41.85, east: 21.8, north: 43.27 },
    { name: "AL", west: 19.1, south: 39.63, east: 21.1, north: 42.66 }
];

function randomSearchBbox() {
    const b = BOUNDS[Math.random() < 0.5 ? 0 : 1];
    const half = SEARCH_BOX_SIZE_DEG / 2;
    const minLng = b.west + half;
    const maxLng = b.east - half;
    const minLat = b.south + half;
    const maxLat = b.north - half;

    const lng = minLng + Math.random() * (maxLng - minLng);
    const lat = minLat + Math.random() * (maxLat - minLat);

    return {
        west: lng - half,
        south: lat - half,
        east: lng + half,
        north: lat + half,
        country: b.name
    };
}

const collectedIds = new Set();
const TARGET_COUNT = 200;

async function run() {
    console.log(`Starting harvest for ${TARGET_COUNT} IDs...`);

    let attempts = 0;
    while (collectedIds.size < TARGET_COUNT) {
        attempts++;
        const bbox = randomSearchBbox();
        console.log(`\nAttempt ${attempts}: Country ${bbox.country} (Got ${collectedIds.size}/${TARGET_COUNT})`);

        // Request thumbnails to ensure playability
        const url = `https://graph.mapillary.com/images?access_token=${token}&fields=id,computed_geometry,thumb_2048_url,thumb_1024_url&bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}&limit=100&is_pano=false`;

        try {
            const data = await new Promise((resolve, reject) => {
                https.get(url, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        if (res.statusCode !== 200) reject(`HTTP ${res.statusCode}: ${body}`);
                        else resolve(JSON.parse(body));
                    });
                }).on('error', reject);
            });

            const images = data.data || [];
            let addedBatch = 0;

            for (const img of images) {
                if (img.computed_geometry && (img.thumb_2048_url || img.thumb_1024_url)) {
                    if (!collectedIds.has(img.id)) {
                        collectedIds.add(img.id);
                        addedBatch++;
                    }
                }
            }

            console.log(`  -> Found ${images.length} raw, added ${addedBatch} new valid IDs`);

        } catch (e) {
            console.error("  -> API Error:", e);
        }

        if (attempts > 50) {
            console.log("Too many attempts, stopping early.");
            break;
        }
    }

    // Write to file
    const outPath = path.resolve(process.cwd(), 'src/lib/generated-fallbacks.ts');
    const fileContent = `// Auto-generated fallback IDs
// Generated at ${new Date().toISOString()}

export const GENERATED_IDS = [
${Array.from(collectedIds).map(id => `  "${id}",`).join('\n')}
];
`;
    fs.writeFileSync(outPath, fileContent);
    console.log(`\nSUCCESS! Wrote ${collectedIds.size} IDs to ${outPath}`);
}

run();
