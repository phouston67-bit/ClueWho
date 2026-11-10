import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRoundToken } from "@/lib/session";
import { getPersonById } from "@/lib/people";
import { calculateRoundScore } from "@/lib/scoring";

/**
 * POST /api/round/reveal
 *
 * Ends a round that did NOT finish via a correct guess - either all 5
 * questions were used, or the player gave up early. Always scores as a
 * loss (0 points, streak reset to 0) and returns the person's identity so
 * the UI can show the reveal screen.
 */

const bodySchema = z.object({
  roundToken: z.string().min(1),
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

  const elapsedSeconds = Math.max(0, (Date.now() - payload.startedAt) / 1000);
  const score = calculateRoundScore({
    questionsUsed: payload.questionsUsed,
    elapsedSeconds,
    wrongGuesses: payload.wrongGuesses,
    won: false,
    streakBeforeRound: payload.streakBeforeRound,
  });

  return NextResponse.json({
    person: {
      name: person.name,
      category: person.category,
      revealFact: person.revealFact,
      image: person.image,
    },
    score,
  });
}
