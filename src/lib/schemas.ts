import { z } from "zod";

export const roundSchema = z.object({
  roundId: z.string(),
  imageId: z.string(),
  imageUrl: z.string().url(),
  country: z.union([z.literal("XK"), z.literal("AL")]),
  location: z.object({
    lng: z.number(),
    lat: z.number(),
  }),
  capturedAt: z.union([z.string(), z.number()]).optional(),
  creatorUsername: z.string().optional(),
  mapillaryUrl: z.string().url(),
  compassAngle: z.number().optional(),
});

export type Round = z.infer<typeof roundSchema>;

export const savedGameSchema = z.object({
  version: z.literal(1),
  totalRounds: z.number().int().positive(),
  currentRoundIndex: z.number().int().nonnegative(),
  totalScore: z.number().int().nonnegative(),
  rounds: z.array(
    z.object({
      roundId: z.string(),
      imageId: z.string(),
      country: z.union([z.literal("XK"), z.literal("AL")]),
      trueLocation: z.object({ lng: z.number(), lat: z.number() }),
      guessLocation: z.object({ lng: z.number(), lat: z.number() }),
      distanceKm: z.number(),
      score: z.number().int(),
    })
  ),
});

export type SavedGame = z.infer<typeof savedGameSchema>;
