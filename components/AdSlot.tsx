"use client";

/**
 * Isolated placeholder for a Google AdSense banner/interstitial unit.
 *
 * This component is deliberately kept self-contained (no game logic) so it
 * can be swapped out later for a native AdMob integration when the app is
 * wrapped with Capacitor for iOS/Android - see README.md "Ads" section.
 *
 * To go live with real AdSense ads:
 *   1. Get an approved Google AdSense account and ad unit.
 *   2. Set NEXT_PUBLIC_ADSENSE_CLIENT_ID in your environment.
 *   3. Load the AdSense script (e.g. in app/layout.tsx via next/script) and
 *      replace the placeholder <div> below with the real <ins class="adsbygoogle">
 *      element for your ad unit, per Google's AdSense docs.
 */
export default function AdSlot({
  slot = "banner",
}: {
  slot?: "banner" | "interstitial";
}) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <div
      className="flex min-h-[60px] w-full items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-xs text-slate-600"
      data-ad-slot={slot}
      data-ad-client={clientId ?? "unconfigured"}
    >
      {clientId ? "Ad slot" : "Ad slot placeholder (set NEXT_PUBLIC_ADSENSE_CLIENT_ID)"}
    </div>
  );
}
