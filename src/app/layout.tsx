import type { Metadata } from "next";
import { Manrope, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

// Manrope's geometric, single-story letterforms are the closest Google
// Font match to PAINA's own wordmark (bold, circular, lowercase) that
// also ships a proper Vietnamese subset (Poppins' next/font build does not).
const heading = Manrope({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PAINA Game Hub",
  description: "Nền tảng mini game nội bộ cho nhân sự PAINA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${heading.variable} ${beVietnamPro.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
