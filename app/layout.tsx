import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "10Clues — Guess Who or What",
  description:
    "A mobile-first, Guess-Who-style game: ask yes/no questions and guess the famous person, place, or brand.",
  manifest: "/manifest.json",
  applicationName: "10Clues",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "10Clues",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <html lang="en">
      <body>
        {/* Loads Google's AdSense script once, site-wide, only when a real
            client ID is configured - see components/AdSlot.tsx and the
            README's "Ads" section. */}
        {adsenseClientId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-6 pt-[env(safe-area-inset-top)]">
          {children}
        </div>
      </body>
    </html>
  );
}
