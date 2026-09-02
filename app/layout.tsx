import type { Metadata } from "next";
import "./globals.css";
import AnalyticsConsent from "./analytics";

export const metadata: Metadata = { title: "Saddle Signals – Track Strats", description: "Spot potentially significant jockey changes, from leading riders taking over to claimers brought in to reduce the weight." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}<AnalyticsConsent/></body></html>; }
