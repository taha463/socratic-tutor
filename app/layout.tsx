import "./globals.css";
import React from "react";
import { ConnectionBanner } from "@/components/setup/ConnectionBanner";

export const metadata = {
  title: "Socratic Tutor — Learn it by working it out",
  description: "A tutor that asks, shows, and never just hands you the answer.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Geist+Mono:wght@400;500;600&family=Kalam:wght@300;400;700&family=Onest:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ConnectionBanner />
        {children}
      </body>
    </html>
  );
}
