import { NextResponse } from "next/server";
import { randomCountry, randomSearchBbox, FALLBACK_IDS, isLocationSafe } from "@/lib/countries";
import {
  mapillaryImageUrl,
  pickPlayableImage,
  searchImagesByBbox,
} from "@/lib/mapillary";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isPreload = searchParams.get("preload") === "true";

  // If preloading in background, allow 60s for slow Mapillary API.
  // If urgent (user waiting), cap at 4.5s to fallback quickly.
  const TIMEOUT_MS = isPreload ? 60000 : 4500;

  const token = process.env.MAPILLARY_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Missing MAPILLARY_TOKEN. Add it to .env.local (server-side only).",
      },
      { status: 500 }
    );
  }

  const country = randomCountry();

  // Helper to try finding a single valid round
  const tryFindRound = async () => {
    try {
      const bbox = randomSearchBbox(country);
      // console.log(`[DEBUG] Search attempt for ${country}:`, bbox);

      // Increased limit slightly for better hit rate
      const allImages = await searchImagesByBbox({ token, bbox, limit: 100 });

      // Strict filtering: discard any images outside safe zones
      const images = allImages.filter(img => {
        const c = img.computed_geometry?.coordinates;
        return c && isLocationSafe(c[1], c[0]); // lat, lng
      });

      // console.log(`[DEBUG] Found ${images.length} safe images (of ${allImages.length})`);

      const picked = pickPlayableImage(images);

      if (!picked) {
        // console.log("[DEBUG] No playable image in batch");
        return null;
      }

      const url = picked.thumb_2048_url ?? picked.thumb_1024_url;
      const coords = picked.computed_geometry?.coordinates;
      if (!url || !coords) {
        // console.log("[DEBUG] Picked image missing data");
        return null;
      }

      const [lng, lat] = coords;

      return {
        roundId: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
        imageId: picked.id,
        imageUrl: url,
        country,
        location: { lng, lat },
        capturedAt: picked.captured_at,
        creatorUsername: picked.creator?.username,
        mapillaryUrl: mapillaryImageUrl(picked.id),
        compassAngle: picked.compass_angle, // Pass the compass angle
      };
    } catch (err) {
      // console.error("[DEBUG] tryFindRound error:", err);
      // Swallow error to retry
      return null;
    }
  };

  // Launch 5 attempts in parallel to reduce "bad luck" latency
  const attempts = Array.from({ length: 5 }).map(() => tryFindRound());

  // Helper to fetch a specific fallback ID from Mapillary (guarantees refreshed URL)
  // Recursively tries until a safe one is found or limit reached
  const getFallbackRound = async (retries = 3): Promise<any> => {
    if (retries <= 0) throw new Error("Max fallback retries");

    try {
      const id = FALLBACK_IDS[Math.floor(Math.random() * FALLBACK_IDS.length)];
      const fields = "id,geometry,thumb_2048_url,thumb_1024_url,captured_at,creator,compass_angle";
      const url = `https://graph.mapillary.com/${id}?access_token=${token}&fields=${fields}`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Fallback fetch failed");
      const data = await res.json();

      const coords = data.geometry?.coordinates; // [lng, lat]
      if (!coords) throw new Error("No coords in fallback");
      const [lng, lat] = coords;

      // Validate strict safety of fallback too
      if (!isLocationSafe(lat, lng)) {
        console.warn(`[WARN] Fallback ID ${id} is unsafe (${lat},${lng}). Retrying...`);
        return getFallbackRound(retries - 1);
      }

      // Rough country determination
      const isXK = lat > 41.85;
      const country = isXK ? "XK" : "AL";

      return {
        roundId: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
        imageId: data.id,
        imageUrl: data.thumb_2048_url || data.thumb_1024_url,
        country,
        location: { lng, lat },
        capturedAt: data.captured_at,
        creatorUsername: data.creator?.username,
        mapillaryUrl: mapillaryImageUrl(data.id),
        compassAngle: data.compass_angle,
      };
    } catch (e) {
      if (retries > 1) return getFallbackRound(retries - 1);
      console.error("Fallback failed:", e);
      throw e;
    }
  };

  try {
    // Race: 5 parallel searches vs 4.5s timeout
    // If we find a round fast, great. If not, use fallback to keep user happy.
    const searchPromise = Promise.any(
      attempts.map(async (p) => {
        const res = await p;
        if (!res) throw new Error("No round found");
        return res;
      })
    );

    const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
      // Dynamic timeout: 60s for background preloads, 4.5s for urgent loads
      setTimeout(() => resolve({ timeout: true }), TIMEOUT_MS);
    });

    const result = await Promise.race([searchPromise, timeoutPromise]);

    if ((result as any).timeout) {
      // Timeout hit - fetch a guaranteed specific round
      const fallback = await getFallbackRound();
      return NextResponse.json(fallback, { headers: { "Cache-Control": "no-store" } });
    }

    // Success
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    // If all attempts strictly fail
    try {
      const fallback = await getFallbackRound();
      return NextResponse.json(fallback, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return NextResponse.json({ error: "Could not find any rounds" }, { status: 500 });
    }
  }
}
