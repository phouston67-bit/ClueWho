import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRoundToken, updateRoundToken } from "@/lib/session";
import { getPersonById } from "@/lib/people";
import { isGuessMatch } from "@/lib/similarity";
import { calculateRoundScore } from "@/lib/scoring";

/**
 * POST /api/round/guess
 *
 * Fuzzy-matches a free-text guess against the secret person's name (and
 * aliases). Guessing never consumes a question slot. A correct guess ends
 * the round immediately and returns the full reveal + score breakdown; a
 * wrong guess applies a small time penalty (folded into scoring as extra
 * effective elapsed seconds) and lets the player keep playing.
 */

const bodySchema = z.object({
  roundToken: z.string().min(1),
  guess: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const verification = verifyRoundToken(parsed.data.roundToken);
  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: 400 });
  }
  const { payload } = verification;

  const person = getPersonById(payload.personId);
  if (!person) {
    return NextResponse.json({ error: "Round person not found." }, { status: 404 });
  }

  const correct = isGuessMatch(parsed.data.guess, person.name, person.aliases);

  if (!correct) {
    const updatedPayload = {
      ...payload,
      wrongGuesses: payload.wrongGuesses + 1,
    };
    const roundToken = updateRoundToken(updatedPayload);
    return NextResponse.json({
      correct: false,
      roundToken,
      wrongGuesses: updatedPayload.wrongGuesses,
    });
  }

  const elapsedSeconds = Math.max(0, (Date.now() - payload.startedAt) / 1000);
  const score = calculateRoundScore({
    questionsUsed: payload.questionsUsed,
    elapsedSeconds,
    wrongGuesses: payload.wrongGuesses,
    hintsUsed: payload.hintsUsed,
    won: true,
    streakBeforeRound: payload.streakBeforeRound,
  });

  return NextResponse.json({
    correct: true,
    person: {
      id: person.id,
      name: person.name,
      category: person.category,
      revealFact: person.revealFact,
      image: person.image,
    },
    score,
  });
}
