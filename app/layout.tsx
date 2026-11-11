import type { Metadata, Viewport } from "next";
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
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-6 pt-[env(safe-area-inset-top)]">
          {children}
        </div>
      </body>
    </html>
  );
}
