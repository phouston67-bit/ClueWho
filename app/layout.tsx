import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClueWho — Guess the Celebrity",
  description:
    "A mobile-first, Guess-Who-style game: ask yes/no questions and guess the famous person.",
  manifest: "/manifest.json",
  applicationName: "ClueWho",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ClueWho",
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
