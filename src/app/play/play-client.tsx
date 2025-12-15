"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GuessMap } from "@/components/GuessMap";
import { StreetImage } from "@/components/StreetImage";
import { type LngLat } from "@/lib/countries";
import { countryLabel } from "@/lib/mapillary";
import { haversineKm, scoreFromDistanceKm } from "@/lib/geo";
import { roundSchema, type Round, type SavedGame } from "@/lib/schemas";
import { clearSavedGame, loadSavedGame, saveGame } from "@/lib/storage";

const TOTAL_ROUNDS = 5;

type Phase = "loading" | "guessing" | "revealed" | "error";

export default function PlayClient() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  // Cache for preloaded rounds to ensure instant transitions
  const [roundsCache, setRoundsCache] = useState<Map<number, Round>>(new Map());

  const [guess, setGuess] = useState<LngLat | null>(null);
  const [reveal, setReveal] = useState<
    | null
    | {
      distanceKm: number;
      score: number;
    }
  >(null);
  const [totalScore, setTotalScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        // Confirm Guess
        if (phase === "guessing" && guess) {
          e.preventDefault(); // Prevent scrolling
          onConfirmGuess();
        }
        // Next Round
        else if (phase === "revealed") {
          e.preventDefault();
          onNextRound();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, guess, round, roundIndex]); // Re-bind when state changes

  const title = useMemo(() => {
    if (!round) return "Loading…";
    return `${countryLabel(round.country)} • Round ${roundIndex + 1}/${TOTAL_ROUNDS}`;
  }, [round, roundIndex]);

  // Helper to fetch a single round data
  async function fetchRoundData(preload = false): Promise<Round> {
    const url = preload ? "/api/round?preload=true" : "/api/round";
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(typeof json?.error === "string" ? json.error : "Failed");
    }
    return roundSchema.parse(json);
  }

  // Aggressive preloading function
  // We want to fill the cache for all future rounds ASAP
  useEffect(() => {
    let active = true;

    const fillCache = async () => {
      // We start preloading from index 1 (since 0 is handled by initial load) up to TOTAL_ROUNDS
      // We do this in parallel chunks to avoid choking the browser but maximizing throughput
      const promises = [];
      for (let i = 1; i < TOTAL_ROUNDS; i++) {
        if (roundsCache.has(i)) continue;

        // Add a small delay between batches if needed, but for "instant" we go hard.
        // We push a promise that fetches and updates cache.
        const p = fetchRoundData(true)
          .then((data) => {
            if (!active) return;
            setRoundsCache((prev) => new Map(prev).set(i, data));
          })
          .catch((err) => console.warn(`Preload failed for round ${i}`, err));

        promises.push(p);
      }
      await Promise.allSettled(promises);
    };

    if (active) fillCache();

    return () => { active = false; };
  }, []); // Run once on mount

  async function loadRound(nextIndex: number) {
    setPhase("loading");
    setError(null);
    setReveal(null);
    setGuess(null);

    try {
      // Check cache first
      if (roundsCache.has(nextIndex)) {
        const cached = roundsCache.get(nextIndex)!;
        setRound(cached);
        setRoundIndex(nextIndex);
        setPhase("guessing");
        return;
      }

      // If not in cache (e.g. first load or cache miss), fetch strictly
      const parsed = await fetchRoundData();

      // Update state
      setRound(parsed);
      setRoundIndex(nextIndex);
      setPhase("guessing");

      // Update cache
      setRoundsCache((prev) => new Map(prev).set(nextIndex, parsed));

    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setPhase("error");
    }
  }

  useEffect(() => {
    // New session whenever you open /play.
    clearSavedGame();
    // Load round 0 immediately
    loadRound(0);
  }, []);

  function onConfirmGuess() {
    if (!round || !guess) return;

    const distanceKm = haversineKm(guess, round.location);
    const score = scoreFromDistanceKm(distanceKm);

    setReveal({ distanceKm, score });
    setPhase("revealed");

    const existing = loadSavedGame();

    const nextRounds = [
      ...(existing?.rounds ?? []),
      {
        roundId: round.roundId,
        imageId: round.imageId,
        country: round.country,
        trueLocation: round.location,
        guessLocation: guess,
        distanceKm,
        score,
      },
    ];

    // Calculate new total score
    const nextTotalScore = totalScore + score;
    setTotalScore(nextTotalScore);

    const next: SavedGame = {
      version: 1,
      totalRounds: TOTAL_ROUNDS,
      currentRoundIndex: roundIndex,
      totalScore: nextTotalScore,
      rounds: nextRounds,
    };

    saveGame(next);
  }

  async function onNextRound() {
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      router.push("/results");
      return;
    }

    await loadRound(roundIndex + 1);
  }

  if (!round) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute -left-1/4 -top-1/4 h-[50vw] w-[50vw] animate-pulse rounded-full bg-indigo-600 blur-[100px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[50vw] w-[50vw] animate-pulse rounded-full bg-purple-600 blur-[100px] delay-1000" />
        </div>

        {/* Content */}
        <div className="relative flex flex-col items-center gap-6">
          {/* Custom Spinner */}
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/10 border-t-emerald-500" />
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="text-xl font-bold tracking-tight text-white">
              {roundIndex === 0 ? "Preparing your journey..." : "Traveling to next location..."}
            </div>
            <div className="text-sm font-medium text-zinc-400">
              Exploring Kosovo & Albania
            </div>
          </div>

          {phase === "error" && error ? (
            <div className="mt-4 rounded-lg bg-rose-900/50 px-4 py-2 text-sm text-rose-200 backdrop-blur-sm">
              Error: {error} <br />
              <button onClick={() => window.location.reload()} className="underline hover:text-white">Retry</button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (phase === "revealed" && round && reveal && guess) {
    return (
      <div className="fixed inset-0 z-50 bg-black text-zinc-100">
        <GuessMap
          className="h-full w-full"
          guess={guess}
          onGuessChange={() => { }}
          locked={true}
          trueLocation={round.location}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 flex items-center justify-center p-4">
          <div className="pointer-events-auto flex w-full max-w-4xl items-center overflow-hidden rounded-xl border border-white/10 bg-zinc-900/90 shadow-2xl backdrop-blur-xl">
            {/* Message Section */}
            <div className="flex h-16 flex-1 items-center justify-center border-r border-white/10 bg-white/5 px-6 text-center text-sm font-medium text-zinc-300">
              {reveal.distanceKm < 10 && "Unbelievable! Spot on!"}
              {reveal.distanceKm >= 10 && reveal.distanceKm < 50 && "Amazing accuracy!"}
              {reveal.distanceKm >= 50 && reveal.distanceKm < 200 && "Great guess!"}
              {reveal.distanceKm >= 200 && reveal.distanceKm < 1000 && "Not too bad."}
              {reveal.distanceKm >= 1000 && reveal.distanceKm < 3000 && "Right continent, wrong country."}
              {reveal.distanceKm >= 3000 && "At least it was on the correct planet."}
            </div>

            {/* Distance Section */}
            <div className="flex h-16 w-48 items-center justify-center gap-3 bg-zinc-800/50 px-6 font-semibold text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5 text-zinc-400"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
              {reveal.distanceKm.toFixed(1)} km
            </div>

            {/* Button Section */}
            <button
              onClick={onNextRound}
              className="flex h-16 w-40 items-center justify-center bg-emerald-600 px-6 font-bold text-white transition hover:bg-emerald-500"
            >
              {roundIndex + 1 >= TOTAL_ROUNDS ? "Results" : "Continue"}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="ml-2 h-4 w-4"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <StreetImage
        src={round.imageUrl}
        attribution={{
          mapillaryUrl: round.mapillaryUrl,
          creatorUsername: round.creatorUsername,
        }}
        overlay={
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4">
            {/* Top Bar: Compass (Center) & Score (Right) */}
            <div className="relative flex w-full items-start justify-center">
              {/* Center: Compass */}
              <div className="pointer-events-auto">
                <CompassStrip angle={round.compassAngle ?? 0} />
              </div>

              {/* Right: Score Board */}
              <div className="absolute right-0 top-0 pointer-events-auto">
                <div className="flex overflow-hidden rounded-md border border-white/20 bg-gradient-to-br from-indigo-900/90 to-purple-900/90 shadow-lg backdrop-blur-md">
                  {/* Round Info */}
                  <div className="flex flex-col items-center justify-center border-r border-white/20 px-5 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Round</span>
                    <span className="text-xl font-black italic tracking-wide text-white">
                      {roundIndex + 1} / {TOTAL_ROUNDS}
                    </span>
                  </div>

                  {/* Score Info */}
                  <div className="flex flex-col items-center justify-center px-5 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Score</span>
                    <span className="text-xl font-black italic tracking-wide text-white">
                      {totalScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Empty for now (Maps are handled separately below) */}
            <div />
          </div>
        }
      />

      {/* Guess map (locked to Kosovo + Albania) */}
      <div className="pointer-events-none fixed inset-0 z-50">
        <div className="pointer-events-auto absolute bottom-5 right-5 flex flex-col items-end">
          <div className="h-[220px] w-[320px] overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 ease-out hover:h-[400px] hover:w-[500px]">
            <GuessMap
              className="h-full w-full"
              guess={guess}
              onGuessChange={setGuess}
              locked={phase !== "guessing"}
              trueLocation={phase === "revealed" ? round.location : undefined}
              revealInfo={
                reveal
                  ? {
                    round: roundIndex + 1,
                    totalRounds: TOTAL_ROUNDS,
                    distanceKm: reveal.distanceKm,
                    score: reveal.score,
                  }
                  : undefined
              }
            />
          </div>

          {phase === "guessing" ? (
            <button
              onClick={onConfirmGuess}
              disabled={!guess}
              className="mt-3 h-12 w-[320px] rounded-2xl bg-emerald-500 text-sm font-extrabold tracking-wide text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              GUESS
            </button>
          ) : null}

          {phase === "revealed" ? (
            <button
              onClick={onNextRound}
              className="mt-3 h-12 w-full rounded-2xl bg-white text-sm font-extrabold tracking-wide text-black transition hover:bg-zinc-200"
            >
              {roundIndex + 1 >= TOTAL_ROUNDS ? "VIEW RESULTS" : "NEXT ROUND"}
            </button>
          ) : null}
        </div>

        {phase === "error" && error ? (
          <div className="pointer-events-auto absolute bottom-5 right-5 max-w-md rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-zinc-100 backdrop-blur">
            <div className="font-semibold">Couldn’t load a round</div>
            <div className="mt-1 text-zinc-300">{error}</div>
            <button
              onClick={() => loadRound(roundIndex)}
              className="mt-3 h-10 rounded-xl bg-white px-4 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </div >
  );
}

function CompassStrip({ angle }: { angle: number }) {
  // Normalize angle to 0-360
  const normalized = (angle % 360 + 360) % 360;

  // Configuration
  const VISIBLE_DEGREES = 70; // Zoomed in a bit more (GeoGuessr style)
  const WIDTH_PX = 320; // Width of the component
  const PIXELS_PER_DEGREE = WIDTH_PX / VISIBLE_DEGREES;

  // Total width of one 360-degree cycle
  const CYCLE_WIDTH = 360 * PIXELS_PER_DEGREE;

  // Generate ticks
  const ticks: { degree: number; label: string; type: "major" | "medium" | "minor" }[] = [];
  for (let d = 0; d < 360; d += 5) { // Tick every 5 degrees
    let label = "";
    let type: "major" | "medium" | "minor" = "minor";

    if (d % 45 === 0) {
      type = "major";
      if (d === 0) label = "N";
      else if (d === 45) label = "NE";
      else if (d === 90) label = "E";
      else if (d === 135) label = "SE";
      else if (d === 180) label = "S";
      else if (d === 225) label = "SW";
      else if (d === 270) label = "W";
      else if (d === 315) label = "NW";
    } else if (d % 15 === 0) {
      type = "medium";
    }

    ticks.push({ degree: d, label, type });
  }

  return (
    <div className="relative h-12 w-80 overflow-hidden rounded-full border border-white/10 bg-zinc-900/90 backdrop-blur-md">
      {/* Center Indicators (Triangles) */}
      <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white drop-shadow-md" />
      <div className="absolute bottom-0 left-1/2 z-30 -translate-x-1/2 border-b-[8px] border-l-[6px] border-r-[6px] border-b-white border-l-transparent border-r-transparent drop-shadow-md" />

      {/* Fade Overlays (Safer than mask-image) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-12 bg-gradient-to-r from-zinc-900 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-12 bg-gradient-to-l from-zinc-900 to-transparent" />

      {/* Strip */}
      <div
        className="absolute inset-y-0 left-1/2 flex h-full items-center will-change-transform transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(-${normalized * PIXELS_PER_DEGREE}px)`,
        }}
      >
        {/* Render 3 sets of ticks for seamless wrapping [-1, 0, 1] */}
        {[-1, 0, 1].map((offset) => (
          <div
            key={offset}
            className="absolute flex items-center h-full"
            style={{
              left: `${offset * CYCLE_WIDTH}px`,
              width: `${CYCLE_WIDTH}px`
            }}
          >
            {ticks.map((t) => (
              <div
                key={t.degree}
                className="absolute flex -translate-x-1/2 flex-col items-center justify-center pt-1"
                style={{ left: `${t.degree * PIXELS_PER_DEGREE}px` }}
              >
                {t.type === "major" ? (
                  <span className="text-sm font-black tracking-widest text-white drop-shadow-md">{t.label}</span>
                ) : (
                  <div
                    className={`w-0.5 rounded-full bg-white shadow-[0_0_2px_rgba(0,0,0,0.5)] ${t.type === "medium" ? "h-3 opacity-90" : "h-1.5 opacity-50"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
