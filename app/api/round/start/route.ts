import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pickRandomPerson, resolveCategory } from "@/lib/people";
import { createRoundToken } from "@/lib/session";
import { SCORING_RULES } from "@/lib/scoring";

/**
 * POST /api/round/start
 *
 * Secretly picks a person (optionally restricted to a category) and returns
 * ONLY the category + image + an opaque signed round token. The person's
 * name and facts never leave the server until /api/round/guess (on a
 * correct guess) or /api/round/reveal.
 */

const bodySchema = z.object({
  category: z.string().optional(),
  currentStreak: z.number().int().min(0).max(1000).optional().default(0),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const category = resolveCategory(parsed.data.category);

  let person;
  try {
    person = pickRandomPerson(category);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }

  const roundToken = createRoundToken({
    personId: person.id,
    category: person.category,
    questionsUsed: 0,
    wrongGuesses: 0,
    startedAt: Date.now(),
    streakBeforeRound: parsed.data.currentStreak,
  });

  return NextResponse.json({
    roundToken,
    category: person.category,
    image: person.image,
    maxQuestions: SCORING_RULES.MAX_QUESTIONS,
  });
}
