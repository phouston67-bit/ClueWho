import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import type { AnswerLabel, Person } from "@/lib/types";
import { ANSWER_LABELS } from "@/lib/types";

/**
 * Thin wrapper around the OpenAI client that grounds every yes/no/sometimes/
 * unclear answer in a person's curated, server-only fact sheet and enforces
 * a strictly constrained structured output so the client never receives
 * free-form text that could leak the secret person's identity.
 */

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your .env.local file (see .env.local.example)."
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const answerSchema = z.object({
  answer: z.enum(ANSWER_LABELS),
  clarification: z.string().max(140).optional().nullable(),
});

export interface GroundedAnswer {
  answer: AnswerLabel;
  clarification?: string;
}

function buildSystemPrompt(person: Person): string {
  const factLines = person.facts.map((f, i) => `${i + 1}. ${f}`).join("\n");
  return [
    `You are the secret-keeper in a "Guess Who" style game called ClueWho.`,
    `A player is trying to guess the identity of a famous person from the category "${person.category}" by asking yes/no questions.`,
    `You know the person's true identity and the facts below, but you must NEVER reveal, spell out, or strongly imply their name, or any fact not relevant to the yes/no question asked.`,
    `Never mention the person's name, initials, nicknames, or distinctive identifying strings (film titles, team names, company names, book titles, etc.) unless the question is explicitly and narrowly about that detail and answering factually requires confirming/denying it.`,
    `Facts about the secret person (for your grounding only - do not quote them verbatim):`,
    factLines,
    ``,
    `Given the player's yes/no question, respond with EXACTLY one of these four labels: Yes, No, Sometimes, Unclear.`,
    `- Use "Yes" or "No" whenever the facts clearly support a direct answer.`,
    `- Use "Sometimes" for questions that are partially true, true in some eras/contexts, or ambiguous but still answerable.`,
    `- Use "Unclear" only when the facts genuinely do not cover the question, or when answering would require revealing the person's identity directly.`,
    `You may add a short clarifying clause (under 140 characters) that gives a *hint-level* amount of extra color without naming the person, a specific work title, or any other uniquely-identifying proper noun.`,
    `Always respond using the provided JSON schema.`,
  ].join("\n");
}

/**
 * Ask the grounded AI a single yes/no question about `person`, returning a
 * strictly validated, enum-constrained answer.
 */
export async function askGroundedQuestion(
  person: Person,
  question: string
): Promise<GroundedAnswer> {
  const openai = getClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_completion_tokens: 150,
    messages: [
      { role: "system", content: buildSystemPrompt(person) },
      {
        role: "user",
        content: `Player's yes/no question: "${question}"\n\nRespond with the JSON object only.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "grounded_answer",
        strict: true,
        schema: {
          type: "object",
          properties: {
            answer: { type: "string", enum: [...ANSWER_LABELS] },
            clarification: { type: ["string", "null"], maxLength: 140 },
          },
          required: ["answer", "clarification"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned an empty response.");
  }

  const parsed = answerSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    // Fail safe: treat an unparsable/unexpected response as "Unclear" rather
    // than ever surfacing raw model text to the client.
    return { answer: "Unclear" };
  }

  return {
    answer: parsed.data.answer,
    clarification: parsed.data.clarification ?? undefined,
  };
}
