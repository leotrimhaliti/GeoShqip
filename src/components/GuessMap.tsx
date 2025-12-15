"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl"; // Removed static import
import {
  boundsToMapLibre,
  PLAY_BOUNDS,
  type Bounds,
  type LngLat,
} from "@/lib/countries";
import "maplibre-gl/dist/maplibre-gl.css"; // Ensure CSS is still imported if not global

// Types for MapLibre to avoid pulling in the heavy lib for just types
type MapLibreMap = import("maplibre-gl").Map;
type Marker = import("maplibre-gl").Marker;

type RevealInfo = {
  round: number;
  totalRounds: number;
  distanceKm: number;
  score: number;
};

export function GuessMap(props: {
  className?: string;
  guess: LngLat | null;
  onGuessChange: (next: LngLat) => void;
  locked: boolean;
  trueLocation?: LngLat;
  revealInfo?: RevealInfo;
  bounds?: Bounds;
}) {
  const {
    className,
    guess,
    onGuessChange,
    locked,
    trueLocation,
    revealInfo,
    bounds,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const guessMarkerRef = useRef<Marker | null>(null);
  const trueMarkerRef = useRef<Marker | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);

  const activeBounds = useMemo(() => bounds ?? PLAY_BOUNDS, [bounds]);

  // Store the library instance to avoid re-importing
  const libRef = useRef<typeof import("maplibre-gl") | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    let mapInstance: MapLibreMap | undefined;

    // Dynamic import to save ~600KB initial load
    import("maplibre-gl").then((maplibregl) => {
      libRef.current = maplibregl;

      // Check if unmounted
      if (!containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "",
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        },
        center: [20.8, 42.3],
        zoom: 6,
        attributionControl: false,
        maxBounds: undefined,
        minZoom: 1,
      });

      mapInstance = map;

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-left"
      );
      map.addControl(new maplibregl.AttributionControl({ compact: true }));

      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();

      const initialBounds = boundsToMapLibre(activeBounds);

      map.once("load", () => {
        map.fitBounds(initialBounds, { padding: 40, duration: 0 });

        map.addSource("route", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        // Add layers (same as before)
        map.addLayer({
          id: "route-glow",
          type: "line",
          source: "route",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#000000",
            "line-width": 4,
            "line-opacity": 0.5,
          },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#ffffff",
            "line-width": 3,
            "line-dasharray": [1, 2],
          },
        });

        setIsMapReady(true);
      });

      map.on("click", (e) => {
        if (locked) return;
        onGuessChange({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });

      mapRef.current = map;
    });

    return () => {
      mapInstance?.remove();
      mapRef.current = null;
    };
  }, [activeBounds, locked, onGuessChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    if (!guess) {
      guessMarkerRef.current?.remove();
      guessMarkerRef.current = null;
      return;
    }

    const updateMarker = (maplibregl: typeof import("maplibre-gl")) => {
      if (!guessMarkerRef.current) {
        guessMarkerRef.current = new maplibregl.Marker({ color: "#facc15" })
          .setLngLat([guess.lng, guess.lat])
          .addTo(map);
      } else {
        guessMarkerRef.current.setLngLat([guess.lng, guess.lat]);
      }
    };

    if (libRef.current) {
      updateMarker(libRef.current);
    } else {
      import("maplibre-gl").then(lib => {
        libRef.current = lib;
        updateMarker(lib);
      });
    }
  }, [guess, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const src = map.getSource("route") as any;

    if (!trueLocation) {
      trueMarkerRef.current?.remove();
      trueMarkerRef.current = null;
      src?.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const updateMap = (maplibregl: typeof import("maplibre-gl")) => {
      if (!trueMarkerRef.current) {
        trueMarkerRef.current = new maplibregl.Marker({ color: "#ef4444" })
          .setLngLat([trueLocation.lng, trueLocation.lat])
          .addTo(map);
      } else {
        trueMarkerRef.current.setLngLat([trueLocation.lng, trueLocation.lat]);
      }

      // Bounds fit needs the class
      if (guess) {
        const bounds = new maplibregl.LngLatBounds()
          .extend([guess.lng, guess.lat])
          .extend([trueLocation.lng, trueLocation.lat]);

        // INSTANT FIT (Duration 0)
        map.fitBounds(bounds, { padding: 100, duration: 0 });
      }
    };

    if (libRef.current) {
      updateMap(libRef.current);
    } else {
      import("maplibre-gl").then(lib => {
        libRef.current = lib;
        updateMap(lib);
      });
    }

    if (guess) {
      src?.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [guess.lng, guess.lat],
                [trueLocation.lng, trueLocation.lat],
              ],
            },
          },
        ],
      });
    }
  }, [guess, trueLocation, isMapReady]);

  return (
    <div className={`h-full w-full ${className ?? ""}`.trim()}>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20"
      >
        <div className="pointer-events-none absolute inset-0 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]" />

        {revealInfo ? (
          <div className="absolute bottom-3 right-3 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-zinc-100 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div className="text-zinc-300">Round</div>
              <div className="font-semibold">
                {revealInfo.round}/{revealInfo.totalRounds}
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-4">
              <div className="text-zinc-300">Distance</div>
              <div className="font-semibold">
                {revealInfo.distanceKm.toFixed(1)} km
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-4">
              <div className="text-zinc-300">Score</div>
              <div className="font-semibold">{revealInfo.score}</div>
            </div>
          </div>
        ) : null}

        {!locked ? (
          <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] text-zinc-200 backdrop-blur">
            Click to place your guess
          </div>
        ) : null}
      </div>
    </div>
  );
}
