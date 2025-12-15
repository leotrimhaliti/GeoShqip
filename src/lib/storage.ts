"use client";

import { savedGameSchema, type SavedGame } from "@/lib/schemas";

const KEY = "geo:lastGame";

export function loadSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = savedGameSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveGame(game: SavedGame) {
  localStorage.setItem(KEY, JSON.stringify(game));
}

export function clearSavedGame() {
  localStorage.removeItem(KEY);
}
