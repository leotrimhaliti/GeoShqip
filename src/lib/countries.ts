export type CountryCode = "XK" | "AL";

export type LngLat = {
  lng: number;
  lat: number;
};

export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

// Practical (approx) bounds; good enough to lock gameplay to KS/AL.
// Practical (approx) bounds; good enough to lock gameplay to KS/AL.
// NOTE: These are the visual bounds for the map, not the search bounds.
export const COUNTRY_BOUNDS: Record<CountryCode, Bounds> = {
  // Kosovo
  XK: { west: 20.0, south: 41.85, east: 21.8, north: 43.27 },
  // Albania
  AL: { west: 19.1, south: 39.63, east: 21.1, north: 42.66 },
};

export const PLAY_BOUNDS: Bounds = {
  west: Math.min(COUNTRY_BOUNDS.XK.west, COUNTRY_BOUNDS.AL.west),
  south: Math.min(COUNTRY_BOUNDS.XK.south, COUNTRY_BOUNDS.AL.south),
  east: Math.max(COUNTRY_BOUNDS.XK.east, COUNTRY_BOUNDS.AL.east),
  north: Math.max(COUNTRY_BOUNDS.XK.north, COUNTRY_BOUNDS.AL.north),
};

// Defined safe zones that are strictly INSIDE the countries to avoid borders.
const COUNTRY_SAFE_ZONES: Record<CountryCode, Bounds[]> = {
  XK: [
    // Central/East (Prishtina, Ferizaj, Gjilan, Kamenice)
    { west: 21.0, south: 42.2, east: 21.6, north: 42.8 },
    // West (Peja, Gjakova, Decan)
    { west: 20.25, south: 42.3, east: 20.6, north: 42.7 },
    // South (Prizren, Suhareke)
    { west: 20.6, south: 42.15, east: 20.9, north: 42.4 },
    // North (Mitrovica South, Vushtrri)
    { west: 20.8, south: 42.7, east: 21.1, north: 42.95 },
  ],
  AL: [
    // North-West (Shkoder, Lezhe)
    { west: 19.45, south: 41.7, east: 19.7, north: 42.1 },
    // Central Coast (Tirana, Durres, Kavaje) - avoiding sea by starting 19.4
    { west: 19.4, south: 41.0, east: 19.95, north: 41.5 },
    // Central Inland (Elbasan, Lushnje, Berat)
    { west: 19.7, south: 40.6, east: 20.3, north: 41.1 },
    // South-West (Fier, Vlore)
    { west: 19.45, south: 40.4, east: 19.8, north: 40.8 },
    // Deep South (Sarande, Gjirokaster, Tepelene) - Strictly above 39.8 to avoid Greece
    { west: 19.9, south: 39.85, east: 20.15, north: 40.3 },
    // South-East (Korce, Pogradec) - Strictly west of 20.8 to avoid Greece/Macedonia
    { west: 20.6, south: 40.55, east: 20.75, north: 40.9 },
  ]
};

export function randomCountry(): CountryCode {
  return Math.random() < 0.5 ? "XK" : "AL";
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Mapillary search requires bbox "area" < 0.01 degrees^2.
// A 0.15 x 0.15 box is 0.0225. 0.1 is approx 11km.
const SEARCH_BOX_SIZE_DEG = 0.04; // Reduced to ~4km to be extremely safe

// Hotspots (Cities/Towns) to increase hit rate
const HOTSPOTS: { country: CountryCode; lat: number; lng: number }[] = [
  // Kosovo
  { country: "XK", lat: 42.6629, lng: 21.1655 }, // Prishtina
  { country: "XK", lat: 42.2141, lng: 20.7410 }, // Prizren
  { country: "XK", lat: 42.6600, lng: 20.2900 }, // Peja
  { country: "XK", lat: 42.3833, lng: 20.4333 }, // Gjakova
  { country: "XK", lat: 42.8900, lng: 20.8660 }, // Mitrovica
  { country: "XK", lat: 42.3700, lng: 21.1500 }, // Ferizaj
  { country: "XK", lat: 42.4600, lng: 21.4600 }, // Gjilan
  // Albania
  { country: "AL", lat: 41.3275, lng: 19.8187 }, // Tirana
  { country: "AL", lat: 41.3246, lng: 19.4565 }, // Durres
  { country: "AL", lat: 40.4650, lng: 19.4850 }, // Vlore
  { country: "AL", lat: 42.0683, lng: 19.5126 }, // Shkoder
  { country: "AL", lat: 41.1125, lng: 20.0822 }, // Elbasan
  { country: "AL", lat: 40.7239, lng: 19.5562 }, // Fier
  { country: "AL", lat: 40.6150, lng: 20.7770 }, // Korce
  { country: "AL", lat: 39.8756, lng: 20.0053 }, // Sarande
];

import { GENERATED_IDS } from "./generated-fallbacks";

// Fallback IDs provided by user for fast initial loading
// These are guaranteed to be valid Mapillary images in the region
export const FALLBACK_IDS = GENERATED_IDS;

export function isLocationSafe(lat: number, lng: number): boolean {
  // Check against all safe zones for both countries
  const allZones = [...COUNTRY_SAFE_ZONES.XK, ...COUNTRY_SAFE_ZONES.AL];
  return allZones.some(z =>
    lat >= z.south && lat <= z.north && lng >= z.west && lng <= z.east
  );
}

export function randomSearchBbox(country: CountryCode): Bounds {
  // 50% chance to pick a hotspot (guaranteed safe), 50% random safe zone
  const useHotspot = Math.random() < 0.5;

  if (useHotspot) {
    const countrySpots = HOTSPOTS.filter(h => h.country === country);
    if (countrySpots.length > 0) {
      const spot = countrySpots[Math.floor(Math.random() * countrySpots.length)];
      // Randomize slightly around the spot (within ~2km)
      const offset = 0.02;
      const lng = spot.lng + (Math.random() * offset - (offset / 2));
      const lat = spot.lat + (Math.random() * offset - (offset / 2));

      const half = SEARCH_BOX_SIZE_DEG / 2;
      return {
        west: lng - half,
        south: lat - half,
        east: lng + half,
        north: lat + half,
      };
    }
  }

  // Use defined Safe Zones
  const zones = COUNTRY_SAFE_ZONES[country];
  const zone = zones[Math.floor(Math.random() * zones.length)];

  // Pick a point within the Safe Zone
  // Ensure we don't pick a point so close to the edge that the box spills out
  const margin = SEARCH_BOX_SIZE_DEG / 2;
  // If zone is too small, just use center.
  const safeWest = zone.west + margin;
  const safeEast = zone.east - margin;
  const safeSouth = zone.south + margin;
  const safeNorth = zone.north - margin;

  const validWest = safeWest < safeEast ? safeWest : (zone.west + zone.east) / 2;
  const validEast = safeEast > safeWest ? safeEast : (zone.west + zone.east) / 2;
  const validSouth = safeSouth < safeNorth ? safeSouth : (zone.south + zone.north) / 2;
  const validNorth = safeNorth > safeSouth ? safeNorth : (zone.south + zone.north) / 2;

  const lng = randomBetween(validWest, validEast);
  const lat = randomBetween(validSouth, validNorth);

  return {
    west: lng - margin,
    south: lat - margin,
    east: lng + margin,
    north: lat + margin,
  };
}

export function boundsToMapLibre(b: Bounds): [[number, number], [number, number]] {
  return [
    [b.west, b.south],
    [b.east, b.north],
  ];
}
