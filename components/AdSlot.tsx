"use client";

import { useEffect, useRef } from "react";

/**
 * Google AdSense banner/interstitial unit.
 *
 * This component is deliberately kept self-contained (no game logic) so it
 * can be swapped out later for a native AdMob integration when the app is
 * wrapped with Capacitor for iOS/Android - see README.md "Ads" section.
 *
 * Renders a real <ins class="adsbygoogle"> ad unit once all of
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID and the per-slot ad unit ID
 * (NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID / NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT_ID)
 * are set; falls back to a dev placeholder otherwise so local development
 * never depends on an approved AdSense account. The script tag itself is
 * loaded once, site-wide, in app/layout.tsx.
 */
export default function AdSlot({
  slot = "banner",
}: {
  slot?: "banner" | "interstitial";
}) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const adSlotId =
    slot === "interstitial"
      ? process.env.NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT_ID
      : process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID;
  const configured = Boolean(clientId && adSlotId);
  const sizeClasses =
    slot === "interstitial" ? "min-h-[160px]" : "min-h-[60px]";
  const insRef = useRef<HTMLModElement>(null);
  const hasPushedRef = useRef(false);

  useEffect(() => {
    if (!configured) return;
    // React Strict Mode intentionally double-invokes effects in development
    // (mount -> effect -> cleanup -> effect again) without actually
    // unmounting the DOM, so the same real <ins> element would otherwise
    // get adsbygoogle.push() called on it twice - AdSense throws "already
    // have ads in them" on the second call. AdSense only marks the slot
    // with data-adsbygoogle-status once the ad has actually rendered
    // (which can be async/delayed), so that attribute can't be checked
    // synchronously here; a ref flag set immediately after push() persists
    // across the same double-invocation and reliably prevents the re-push.
    if (hasPushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      hasPushedRef.current = true;
    } catch {
      // AdSense script not loaded yet (e.g. an ad blocker) - fail silently,
      // never block gameplay on ad delivery.
    }
  }, [configured]);

  if (!configured) {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-xs text-slate-600 ${sizeClasses}`}
        data-ad-slot={slot}
      >
        {`Ad slot placeholder (set NEXT_PUBLIC_ADSENSE_CLIENT_ID and NEXT_PUBLIC_ADSENSE_${slot.toUpperCase()}_SLOT_ID)`}
      </div>
    );
  }

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle block w-full ${sizeClasses}`}
      style={{ display: "block" }}
      data-ad-client={clientId}
      data-ad-slot={adSlotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}
