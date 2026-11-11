"use client";

import { useState } from "react";

interface RewardedAdProps {
  /** Button label shown before the simulated ad plays. */
  ctaLabel: string;
  /** Label shown while the simulated ad is "playing". */
  playingLabel?: string;
  /** How long the simulated ad takes, in ms. */
  durationMs?: number;
  /** Called once, after the simulated ad finishes. */
  onComplete: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Simulated rewarded-video-ad flow, used as the freemium gate for extra
 * hints and for unlocking the big reveal screen. There is no real ad SDK
 * wired up here - clicking the CTA just "plays" a short timed placeholder
 * (a progress bar) and then calls `onComplete`, exactly like a real
 * rewarded-ad completion callback would.
 *
 * To go live with a real rewarded ad:
 *   - Web (AdSense): replace the setTimeout below with the AdSense
 *     rewarded-ad JS API's show() call, invoking onComplete from its
 *     reward callback. See components/AdSlot.tsx for the banner equivalent.
 *   - Native (Capacitor + AdMob): swap this component for a thin wrapper
 *     around the AdMob rewarded-ad plugin, keeping the same
 *     ctaLabel/onComplete contract so callers don't need to change.
 */
export default function RewardedAd({
  ctaLabel,
  playingLabel = "Playing ad...",
  durationMs = 2200,
  onComplete,
  disabled,
  className,
}: RewardedAdProps) {
  const [playing, setPlaying] = useState(false);

  function handleClick() {
    if (playing || disabled) return;
    setPlaying(true);
    setTimeout(() => {
      setPlaying(false);
      onComplete();
    }, durationMs);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || playing}
      className={
        className ??
        "relative overflow-hidden rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition active:scale-95 hover:bg-amber-400 disabled:pointer-events-none disabled:opacity-50"
      }
    >
      {playing && (
        <span
          aria-hidden
          className="absolute inset-0 origin-left animate-ad-progress bg-amber-300/60"
          style={{ animationDuration: `${durationMs}ms` }}
        />
      )}
      <span className="relative">{playing ? `📺 ${playingLabel}` : ctaLabel}</span>
    </button>
  );
}
