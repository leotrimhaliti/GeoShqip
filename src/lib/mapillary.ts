import type { CountryCode } from "@/lib/countries";

export type MapillaryImage = {
  id: string;
  thumb_2048_url?: string;
  thumb_1024_url?: string;
  is_pano?: boolean;
  captured_at?: string;
  creator?: { username?: string };
  computed_geometry?: { type: "Point"; coordinates: [number, number] };
  compass_angle?: number;
};

type SearchResponse = {
  data?: MapillaryImage[];
};

export async function searchImagesByBbox(args: {
  token: string;
  bbox: { west: number; south: number; east: number; north: number };
  limit?: number;
}): Promise<MapillaryImage[]> {
  const { token, bbox } = args;
  const limit = args.limit ?? 50;

  const url = new URL("https://graph.mapillary.com/images");
  url.searchParams.set("bbox", `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`);
  url.searchParams.set(
    "fields",
    [
      "id",
      "thumb_2048_url",
      "thumb_1024_url",
      "computed_geometry",
      "is_pano",
      "captured_at",
      "creator",
      "compass_angle",
    ].join(",")
  );
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("is_pano", "false");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `OAuth ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mapillary search failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as SearchResponse;
  return Array.isArray(json.data) ? json.data : [];
}

export function pickPlayableImage(images: MapillaryImage[]): MapillaryImage | null {
  const playable = images.filter((img) => {
    const url = img.thumb_2048_url ?? img.thumb_1024_url;
    const coords = img.computed_geometry?.coordinates;
    return Boolean(img.id && url && coords && coords.length === 2);
  });

  if (playable.length === 0) return null;
  return playable[Math.floor(Math.random() * playable.length)] ?? null;
}

export function mapillaryImageUrl(imageId: string): string {
  // Mapillary app deep link (works for most public images).
  return `https://www.mapillary.com/app/?pKey=${encodeURIComponent(imageId)}`;
}

export function countryLabel(country: CountryCode) {
  return country === "XK" ? "Kosovo" : "Albania";
}
