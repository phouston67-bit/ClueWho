import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRoundToken, updateRoundToken } from "@/lib/session";
import { getPersonById } from "@/lib/people";
import { askGroundedQuestion } from "@/lib/openai";
import { SCORING_RULES } from "@/lib/scoring";

/**
 * POST /api/round/ask
 *
 * Accepts a free-text yes/no question, grounds it against the secret
 * person's server-only fact sheet via OpenAI, and returns a strictly
 * constrained Yes/No/Sometimes/Unclear answer (plus a short, non-identifying
 * clarification). Each call consumes one of the player's 5 question slots.
 */

const bodySchema = z.object({
  roundToken: z.string().min(1),
  question: z.string().min(1).max(300),
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

  if (payload.questionsUsed >= SCORING_RULES.MAX_QUESTIONS) {
    return NextResponse.json(
      { error: "No questions remaining for this round." },
      { status: 400 }
    );
  }

  const person = getPersonById(payload.personId);
  if (!person) {
    return NextResponse.json({ error: "Round person not found." }, { status: 404 });
  }

  let result;
  try {
    result = await askGroundedQuestion(person, parsed.data.question);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to get an answer." },
      { status: 502 }
    );
  }

  const updatedPayload = {
    ...payload,
    questionsUsed: payload.questionsUsed + 1,
  };
  const roundToken = updateRoundToken(updatedPayload);

  return NextResponse.json({
    roundToken,
    answer: result.answer,
    clarification: result.clarification ?? null,
    questionsUsed: updatedPayload.questionsUsed,
    questionsRemaining: SCORING_RULES.MAX_QUESTIONS - updatedPayload.questionsUsed,
  });
}
