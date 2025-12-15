"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { loadSavedGame } from "@/lib/storage";
import { countryLabel } from "@/lib/mapillary";
import type { SavedGame } from "@/lib/schemas";

function getRank(score: number, maxScore: number) {
  const p = score / maxScore;
  if (p === 1) return { label: "PERFECT", color: "text-rose-500", emoji: "👑" };
  if (p >= 0.9) return { label: "LEGEND", color: "text-amber-400", emoji: "🏆" };
  if (p >= 0.75) return { label: "MASTER", color: "text-emerald-400", emoji: "💠" };
  if (p >= 0.5) return { label: "EXPLORER", color: "text-blue-400", emoji: "🌍" };
  if (p >= 0.25) return { label: "TRAVELER", color: "text-indigo-400", emoji: "🎒" };
  return { label: "LOST", color: "text-zinc-500", emoji: "💀" };
}

export default function ResultsClient() {
  const [game] = useState<SavedGame | null>(() => loadSavedGame());

  const { totalScore, maxPossible, rank } = useMemo(() => {
    if (!game) return { totalScore: 0, maxPossible: 25000, rank: getRank(0, 25000) };

    // Assuming 5000 per round
    const max = game.totalRounds * 5000;
    const score = game.totalScore;
    return {
      totalScore: score,
      maxPossible: max,
      rank: getRank(score, max),
    };
  }, [game]);

  if (!game) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <h1 className="text-3xl font-black italic uppercase tracking-widest text-zinc-700">No Data</h1>
        <Link href="/play" className="mt-4 px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200">Starting Point</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.2),transparent_70%)]" />

      <main className="relative z-10 mx-auto w-full max-w-2xl px-6 py-12 flex flex-col items-center text-center">

        {/* Header */}
        <div className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-white/50">Session Complete</div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl sm:text-7xl">
          <span className="bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            Game Over
          </span>
        </h1>

        {/* Rank Card */}
        <div className="mt-10 w-full rounded-3xl border border-white/10 bg-zinc-900/80 p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className={`absolute inset-0 opacity-10 blur-3xl ${rank.color.replace('text-', 'bg-')}`} />

          <div className="relative flex flex-col items-center">
            <div className="text-6xl sm:text-8xl animate-bounce drop-shadow-xl mb-4">{rank.emoji}</div>
            <div className={`text-3xl sm:text-5xl font-black italic uppercase tracking-widest ${rank.color} drop-shadow-lg`}>
              {rank.label}
            </div>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-6xl font-black text-white tracking-tight">{totalScore.toLocaleString()}</span>
              <span className="text-xl font-bold text-zinc-500 uppercase">pts</span>
            </div>
            <div className="text-sm font-bold uppercase tracking-widest text-zinc-500 mt-1">
              Out of {maxPossible.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex w-full gap-4">
          <Link
            href="/play"
            className="flex-1 rounded-xl bg-emerald-500 py-4 text-center text-lg font-black uppercase italic tracking-wider text-black transition hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          >
            Play Again
          </Link>
          <Link
            href="/"
            className="flex-1 rounded-xl bg-white/10 py-4 text-center text-lg font-black uppercase italic tracking-wider text-white transition hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            Menu
          </Link>
        </div>

        {/* Round History */}
        <div className="mt-12 w-full space-y-3">
          <div className="text-left text-xs font-bold uppercase tracking-widest text-zinc-500 pl-2">Performance Log</div>
          {game.rounds.map((r, idx) => (
            <div key={r.roundId} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 transition hover:bg-white/10 hover:border-white/20">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/40 font-black text-zinc-400">
                  {idx + 1}
                </div>
                <div className="text-left">
                  <div className="font-bold text-white">{countryLabel(r.country)}</div>
                  <div className="text-xs font-medium text-zinc-400">{r.distanceKm.toFixed(1)} km from target</div>
                </div>
              </div>
              <div className="text-xl font-black italic text-emerald-400">
                +{r.score}
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
