"use client";

import { useState } from "react";

interface ShareStreakProps {
  /** The streak to brag about - current ongoing streak on a win, or the
   * streak that just ended on a loss. */
  streak: number;
  won: boolean;
}

/**
 * Lets the player share their streak (via the Web Share API on mobile, or
 * a clipboard copy fallback on desktop) so a friend can try to beat it.
 */
export default function ShareStreak({ streak, won }: ShareStreakProps) {
  const [copied, setCopied] = useState(false);

  if (streak <= 0) return null;

  const text = won
    ? `I'm on a ${streak}-round winning streak on 10Clues! 🔥 Think you can keep up?`
    : `I got a streak of ${streak} on 10Clues before it ended. 🔥 Can you beat it?`;

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "10Clues", text, url });
        return;
      } catch {
        // Player cancelled the native share sheet, or it's unsupported here
        // - fall back to clipboard below instead of failing silently.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) - nothing more we
      // can do without a real share target, so just no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition active:scale-95 hover:bg-slate-800"
    >
      {copied ? "✅ Copied - go challenge a friend!" : `📤 Share your streak of ${streak}`}
    </button>
  );
}
