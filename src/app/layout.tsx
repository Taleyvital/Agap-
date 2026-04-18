import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { XPToastProvider } from "@/components/providers/XPToastProvider";
import { LanguageProvider } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["italic", "normal"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AGAPE — Compagnon spirituel",
  description: "Compagnon spirituel chrétien avec IA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AGAPE",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#141414" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AGAPE" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/logo-fond-violet.svg" />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} min-h-screen font-sans antialiased`}
      >
        <ThemeProvider><LanguageProvider><XPToastProvider>{children}</XPToastProvider></LanguageProvider></ThemeProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker
                  .register('/sw.js')
              })
            }
          `
        }} />
      </body>
    </html>
  );
}
