import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import "./globals.css";

// Labels are mostly Vietnamese. Be Vietnam Pro is designed for Vietnamese: stacked diacritics (ế, ữ, ặ)
// render at full size instead of falling back to a system font.
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Display serif for headings. Variable, with an italic for the accent phrase in each heading.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["vietnamese", "latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Thuốc Bridge",
  description:
    "Photograph a Vietnamese medicine label: Thuốc Bridge reads the printed ingredients, matches them to US drug names, and flags duplicates with the patient's current medicines. Not a substitute for a pharmacist.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf3ea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${beVietnam.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
