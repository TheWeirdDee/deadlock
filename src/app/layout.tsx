import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";


export const metadata: Metadata = {
  metadataBase: new URL('https://deadlock.wtf'),
  title: "DEADLOCK | Public Accountability on Bitcoin",
  description: "Put your STX where your mouth is. Public accountability vows secured by Stacks and Bitcoin.",
  manifest: "/manifest.json",
  openGraph: {
    title: "DEADLOCK | Public Accountability on Bitcoin",
    description: "Put your STX where your mouth is. Stake it, ship it, or lose it. On-chain accountability for builders.",
    url: "https://deadlock.wtf",
    siteName: "DEADLOCK",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DEADLOCK Protocol" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DEADLOCK | Public Accountability on Bitcoin",
    description: "Put your STX where your mouth is. Stake it, ship it, or lose it.",
    images: ["/og-image.png"],
  },
  other: {
    "talentapp:project_verification": "c9e48fbe31a3afd7ad95f7148a5ecddb2ea1214a0560a124e949b2a62d01d1e303cdef8b627594293ab183bea71d803970e33cc9a50d9e024faed97074b88c5e"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black antialiased selection:bg-white selection:text-black">
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
