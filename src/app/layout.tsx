import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";


/**
 * Global App SEO metadata configs.
 */
export const metadata: Metadata = {
  title: "DEADLOCK | Public Accountability on Bitcoin",
  description: "Put your STX where your mouth is. Public accountability vows secured by Stacks and Bitcoin.",
  other: {
    "talentapp:project_verification": "c9e48fbe31a3afd7ad95f7148a5ecddb2ea1214a0560a124e949b2a62d01d1e303cdef8b627594293ab183bea71d803970e33cc9a50d9e024faed97074b88c5e"
  }
};

/**
 * RootLayout wrap containing base HTML structures and provider contexts.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black antialiased selection:bg-white selection:text-black">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
