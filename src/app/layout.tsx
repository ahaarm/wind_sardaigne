import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vent Sardaigne",
  description: "Prévisions de vent, houle et météo sur les spots de wingfoil de Sardaigne – planification du road-trip.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a7f8c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <a href="/" className="brand">
              🪁 Vent Sardaigne
            </a>
            <Nav />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site">
          Données : <a href="https://open-meteo.com/">Open-Meteo</a> (Météo-France, ItaliaMeteo-ARPAE, DWD, ECMWF, NOAA) ·
          METAR : <a href="https://aviationweather.gov/">aviationweather.gov</a>. Les prévisions ne remplacent pas
          l&apos;observation sur place – naviguez prudemment.
        </footer>
      </body>
    </html>
  );
}
