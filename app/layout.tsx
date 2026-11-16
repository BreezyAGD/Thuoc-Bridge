import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

// Labels are mostly Vietnamese. Be Vietnam Pro is designed for Vietnamese: stacked diacritics (ế, ữ, ặ)
// render at full size instead of falling back to a system font.
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Thuốc Bridge",
  description:
    "Clinician workspace for identifying medicines bought abroad: reads the label, verifies every value against the printed text, maps to RxNorm and checks cited rules. Not a substitute for a pharmacist.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a1020",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
