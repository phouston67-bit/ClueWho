import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRoundToken, updateRoundToken } from "@/lib/session";
import { getPersonById } from "@/lib/people";
import { SCORING_RULES } from "@/lib/scoring";

/**
 * POST /api/round/hint
 *
 * Returns the next unrevealed fact from the secret person's server-only
 * fact sheet as a free-text hint. Hints never consume a question slot, but
 * each one applies a score penalty (see lib/scoring.ts PER_HINT_PENALTY)
 * and counts against the player's "N hints per streak" allowance, which is
 * tracked client-side (like the streak itself) - the server only needs to
 * know how many hints were used *in this round* so the final score is
 * computed honestly, and caps that at the person's available facts and at
 * the global per-streak limit as a safety net against a tampered client.
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

  const maxHints = Math.min(person.facts.length, SCORING_RULES.MAX_HINTS_PER_STREAK);
  if (payload.hintsUsed >= maxHints) {
    return NextResponse.json(
      { error: "No more hints available for this person." },
      { status: 400 }
    );
  }

  const hint = person.facts[payload.hintsUsed];
  const updatedPayload = {
    ...payload,
    hintsUsed: payload.hintsUsed + 1,
  };
  const roundToken = updateRoundToken(updatedPayload);

  return NextResponse.json({
    roundToken,
    hint,
    hintsUsed: updatedPayload.hintsUsed,
    hintPenalty: SCORING_RULES.PER_HINT_PENALTY,
  });
}
