import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "LifeGuard AI - Emergency Response",
  description: "Real-time emergency response AI using Gemini API. Multimodal analysis with voice guidance in Arabic, French, and English.",
  icons: {
    icon: [
      { url: "assets/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "assets/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "assets/apple-touch-icon.png",
  },
  manifest: "assets/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
