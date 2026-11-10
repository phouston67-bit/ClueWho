"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import CategoryPicker from "@/components/CategoryPicker";
import ImageReveal from "@/components/ImageReveal";
import QuestionList, { type AnsweredQuestion } from "@/components/QuestionList";
import AskOrGuessInput from "@/components/AskOrGuessInput";
import ScoreSummary from "@/components/ScoreSummary";
import StreakBadge from "@/components/StreakBadge";
import AdSlot from "@/components/AdSlot";
import Leaderboard from "@/components/Leaderboard";
import type { PersonImage, ScoreBreakdownDTO } from "@/lib/types";
import { recordLeaderboardEntry } from "@/lib/leaderboard";

const STREAK_KEY = "cluewho_streak";
const BEST_STREAK_KEY = "cluewho_best_streak";
const DISPLAY_NAME_KEY = "cluewho_display_name";
const RECENT_PEOPLE_KEY = "cluewho_recent_people";
/**
 * How many recently-revealed person ids to keep excluding from future
 * picks. Capped (rather than unbounded) so the exclusion list doesn't grow
 * forever and so a category can still be replayed once fully cycled - the
 * server falls back to the full pool anyway if an exclusion would leave it
 * empty, so this is just a soft "don't repeat too soon" window.
 */
const RECENT_PEOPLE_LIMIT = 20;

type Phase = "picking" | "playing" | "revealed";

interface RoundState {
  roundToken: string;
  category: string;
  image: PersonImage;
  maxQuestions: number;
  questions: AnsweredQuestion[];
  questionsUsed: number;
  questionsRemaining: number;
  wrongGuesses: number;
  lastGuessWrong: boolean;
}

interface RevealState {
  id: string;
  name: string;
  category: string;
  revealFact: string;
  image: PersonImage;
  score: ScoreBreakdownDTO;
}

function readNumber(key: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(key);
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function readRecentPersonIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_PEOPLE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function rememberRecentPersonId(id: string, current: string[]): string[] {
  const next = [id, ...current.filter((existing) => existing !== id)].slice(
    0,
    RECENT_PEOPLE_LIMIT
  );
  window.localStorage.setItem(RECENT_PEOPLE_KEY, JSON.stringify(next));
  return next;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request to ${url} failed.`);
  }
  return data as T;
}

export default function GameBoard() {
  const [phase, setPhase] = useState<Phase>("picking");
  const [round, setRound] = useState<RoundState | null>(null);
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [recentPersonIds, setRecentPersonIds] = useState<string[]>([]);
  const [startLoading, setStartLoading] = useState(false);
  const [askLoading, setAskLoading] = useState(false);
  const [guessLoading, setGuessLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrongGuessTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrates streak/bestStreak from localStorage (a client-only external
  // system that isn't available during SSR) right before first paint, so
  // real values render without a visible flash. eslint-plugin-react-hooks'
  // set-state-in-effect rule flags any setState-in-effect as a potential
  // derived-state anti-pattern, but a one-time read of an external store on
  // mount - which can't be done during render without an SSR/client
  // mismatch - is exactly the case the rule's own docs call a legitimate
  // exception (https://react.dev/learn/you-might-not-need-an-effect).
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStreak(readNumber(STREAK_KEY));
    setBestStreak(readNumber(BEST_STREAK_KEY));
    setRecentPersonIds(readRecentPersonIds());
  }, []);

  const persistStreaks = useCallback((nextStreak: number, nextBest: number) => {
    setStreak(nextStreak);
    setBestStreak(nextBest);
    window.localStorage.setItem(STREAK_KEY, String(nextStreak));
    window.localStorage.setItem(BEST_STREAK_KEY, String(nextBest));
  }, []);

  const startRound = useCallback(
    async (category?: string) => {
      setError(null);
      setStartLoading(true);
      try {
        const data = await postJson<{
          roundToken: string;
          category: string;
          image: PersonImage;
          maxQuestions: number;
        }>("/api/round/start", {
          category,
          currentStreak: streak,
          excludeIds: recentPersonIds,
        });
        setRound({
          roundToken: data.roundToken,
          category: data.category,
          image: data.image,
          maxQuestions: data.maxQuestions,
          questions: [],
          questionsUsed: 0,
          questionsRemaining: data.maxQuestions,
          wrongGuesses: 0,
          lastGuessWrong: false,
        });
        setReveal(null);
        setPhase("playing");
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setStartLoading(false);
      }
    },
    [streak, recentPersonIds]
  );

  const finishRound = useCallback(
    (result: RevealState) => {
      setReveal(result);
      setPhase("revealed");

      const won = result.score.won;
      const nextStreak = won ? result.score.newStreak : 0;
      const nextBest = Math.max(bestStreak, nextStreak);
      persistStreaks(nextStreak, nextBest);
      setRecentPersonIds((current) => rememberRecentPersonId(result.id, current));

      const displayName =
        window.localStorage.getItem(DISPLAY_NAME_KEY) || "Anonymous";
      void recordLeaderboardEntry({
        displayName,
        score: result.score.finalScore,
        streak: nextStreak,
        category: result.category,
      });
    },
    [bestStreak, persistStreaks]
  );

  const revealRound = useCallback(
    async (roundToken: string) => {
      try {
        const data = await postJson<{
          person: {
            id: string;
            name: string;
            category: string;
            revealFact: string;
            image: PersonImage;
          };
          score: ScoreBreakdownDTO;
        }>("/api/round/reveal", { roundToken });
        finishRound({
          id: data.person.id,
          name: data.person.name,
          category: data.person.category,
          revealFact: data.person.revealFact,
          image: data.person.image,
          score: data.score,
        });
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [finishRound]
  );

  const askQuestion = useCallback(
    async (question: string) => {
      if (!round) return;
      setError(null);
      setAskLoading(true);
      try {
        const data = await postJson<{
          roundToken: string;
          answer: AnsweredQuestion["answer"];
          clarification: string | null;
          questionsUsed: number;
          questionsRemaining: number;
        }>("/api/round/ask", { roundToken: round.roundToken, question });

        const updatedQuestions = [
          ...round.questions,
          { question, answer: data.answer, clarification: data.clarification },
        ];

        setRound({
          ...round,
          roundToken: data.roundToken,
          questions: updatedQuestions,
          questionsUsed: data.questionsUsed,
          questionsRemaining: data.questionsRemaining,
        });

        if (data.questionsRemaining <= 0) {
          await revealRound(data.roundToken);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setAskLoading(false);
      }
    },
    [round, revealRound]
  );

  const submitGuess = useCallback(
    async (guess: string) => {
      if (!round) return;
      setError(null);
      setGuessLoading(true);
      try {
        const data = await postJson<
          | {
              correct: true;
              person: {
                id: string;
                name: string;
                category: string;
                revealFact: string;
                image: PersonImage;
              };
              score: ScoreBreakdownDTO;
            }
          | { correct: false; roundToken: string; wrongGuesses: number }
        >("/api/round/guess", { roundToken: round.roundToken, guess });

        if (data.correct) {
          finishRound({
            id: data.person.id,
            name: data.person.name,
            category: data.person.category,
            revealFact: data.person.revealFact,
            image: data.person.image,
            score: data.score,
          });
          return;
        }

        if (wrongGuessTimeout.current) clearTimeout(wrongGuessTimeout.current);
        setRound({
          ...round,
          roundToken: data.roundToken,
          wrongGuesses: data.wrongGuesses,
          lastGuessWrong: true,
        });
        wrongGuessTimeout.current = setTimeout(() => {
          setRound((prev) => (prev ? { ...prev, lastGuessWrong: false } : prev));
        }, 2500);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setGuessLoading(false);
      }
    },
    [round, finishRound]
  );

  const playAgain = useCallback(() => {
    setPhase("picking");
    setRound(null);
    setReveal(null);
    setError(null);
  }, []);

  const giveUp = useCallback(() => {
    if (!round) return;
    void revealRound(round.roundToken);
  }, [round, revealRound]);

  return (
    <div className="flex flex-1 flex-col gap-5 py-4">
      <StreakBadge streak={streak} bestStreak={bestStreak} />

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-300">
          {error}
        </p>
      )}

      {phase === "picking" && (
        <CategoryPicker onSelect={startRound} disabled={startLoading} />
      )}

      {phase === "playing" && round && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <ImageReveal image={round.image} category={round.category} />

          <QuestionList
            questions={round.questions}
            maxQuestions={round.maxQuestions}
          />

          <AskOrGuessInput
            onAsk={askQuestion}
            onGuess={submitGuess}
            askLoading={askLoading}
            guessLoading={guessLoading}
            questionsRemaining={round.questionsRemaining}
            wrongGuesses={round.wrongGuesses}
            lastGuessWasWrong={round.lastGuessWrong}
          />

          <button
            type="button"
            onClick={giveUp}
            className="text-center text-xs text-slate-500 underline-offset-2 hover:underline"
          >
            Give up &amp; reveal
          </button>
        </div>
      )}

      {phase === "revealed" && reveal && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <ImageReveal
            image={reveal.image}
            category={reveal.category}
            name={reveal.name}
            revealed
          />
          <ScoreSummary
            score={reveal.score}
            revealFact={reveal.revealFact}
            onPlayAgain={playAgain}
          />
        </div>
      )}

      <AdSlot slot="banner" />

      <div className="mt-2 flex flex-col gap-2">
        <h2 className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          Leaderboard
        </h2>
        <Leaderboard />
      </div>
    </div>
  );
}
