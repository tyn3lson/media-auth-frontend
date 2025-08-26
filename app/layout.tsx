// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "DeclassifAI — Media Auth Verifier",
  description: "Upload, hash, and verify media authenticity.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Load Orbitron for the pill titles */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-full">
        {children}

        {/* Small global reset so the background fills and text renders cleanly */}
        <style jsx global>{`
          html, body { height: 100%; margin: 0; padding: 0; }
          body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        `}</style>
      </body>
    </html>
  );
}