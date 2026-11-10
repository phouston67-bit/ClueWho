import crypto from "node:crypto";

/**
 * Stateless, HMAC-signed round session tokens.
 *
 * The secret person's id and all round progress (questions used, wrong
 * guesses, start time) live inside this opaque, server-signed token instead
 * of a database or in-memory store, so the deployment can be fully
 * serverless/stateless. The client only ever sees the opaque token string -
 * never the person's id in cleartext is exposed to the browser in a way it
 * could trust (it's base64, not encrypted, so facts/name must NEVER be
 * embedded here - only the id, which is meaningless without the server-side
 * dataset).
 */

export interface RoundTokenPayload {
  personId: string;
  category: string;
  questionsUsed: number;
  wrongGuesses: number;
  startedAt: number;
  /** Epoch ms after which the round token is no longer valid. */
  exp: number;
  /** The player's streak going into this round, carried for scoring continuity. */
  streakBeforeRound: number;
}

const ROUND_TTL_MS = 1000 * 60 * 20; // 20 minutes to finish a round

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Fall back to a dev-only secret so local `npm run dev` works without
    // extra setup. Production deployments MUST set SESSION_SECRET.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET environment variable must be set in production."
      );
    }
    return "dev-only-insecure-secret-do-not-use-in-production";
  }
  return secret;
}

function base64url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}

function sign(payload: string): string {
  return base64url(
    crypto.createHmac("sha256", getSecret()).update(payload).digest()
  );
}

/** Create a new signed round token for a freshly started round. */
export function createRoundToken(
  payload: Omit<RoundTokenPayload, "exp">
): string {
  const full: RoundTokenPayload = {
    ...payload,
    exp: Date.now() + ROUND_TTL_MS,
  };
  const body = base64url(Buffer.from(JSON.stringify(full), "utf8"));
  const signature = sign(body);
  return `${body}.${signature}`;
}

/** Re-sign an updated payload (e.g. after a question or wrong guess), preserving expiry. */
export function updateRoundToken(payload: RoundTokenPayload): string {
  const body = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const signature = sign(body);
  return `${body}.${signature}`;
}

export type VerifyResult =
  | { ok: true; payload: RoundTokenPayload }
  | { ok: false; error: string };

/** Verify a round token's signature and expiry, returning its payload if valid. */
export function verifyRoundToken(token: string | undefined | null): VerifyResult {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { ok: false, error: "Missing or malformed round token." };
  }
  const [body, signature] = token.split(".");
  const expectedSignature = sign(body);

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { ok: false, error: "Invalid round token signature." };
  }

  let payload: RoundTokenPayload;
  try {
    payload = JSON.parse(base64urlDecode(body).toString("utf8"));
  } catch {
    return { ok: false, error: "Invalid round token payload." };
  }

  if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
    return { ok: false, error: "Round token has expired." };
  }

  return { ok: true, payload };
}
