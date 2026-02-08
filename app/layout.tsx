import type { Metadata, Viewport } from "next";
import { Rubik, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import SWRegistration from "./SWRegistration";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "LifeGuard AI - Emergency Response",
  description:
    "Real-time emergency response AI using Gemini API. Multimodal analysis with voice guidance in Arabic, French, and English.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/assets/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/android/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/android/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/icons/ios/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA / platform meta and links */}
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/ios/apple-touch-icon.png"
        />
        
        {/* iOS Splash Screen Fallback */}
        <link rel="apple-touch-startup-image" href="/icons/android/icon-512.png" />

        <meta name="msapplication-TileColor" content="#000000" />
        <meta
          name="msapplication-TileImage"
          content="/icons/windows/mstile-150x150.png"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <style>{`
          html::-webkit-scrollbar, body::-webkit-scrollbar {
            display: none;
          }
          html, body {
            scrollbar-width: none;
          }
        `}</style>
      </head>
      <body className={`${rubik.variable} ${robotoMono.variable} antialiased`}>
        <SWRegistration />
        <Toaster position="top-center" richColors />
        {children}
      </body>
    </html>
  );
}
