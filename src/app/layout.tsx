import type { Metadata } from "next";
import { Lora, Noto_Serif_TC } from "next/font/google";
import { ReactNode } from "react";

import "@/app/globals.css";

const notoSerifTc = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Stores Checking System",
  description: "Inspection management MVP for Haochu Breakfast",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className={`${notoSerifTc.variable} ${lora.variable} font-serifTc antialiased`}>
        {children}
      </body>
    </html>
  );
}
