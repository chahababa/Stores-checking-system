import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // 舊色票保留（其他頁還在用，不能動）
        cream: "#F5ECD7",
        warm: "#C97B3A",
        ink: "#4A3728",
        soft: "#E8D5B7",
        success: "#27AE60",
        warning: "#F39C12",
        danger: "#C0392B",

        // Neo Brutalism 色票（新加）
        nb: {
          bg: "#F4EFE6",
          bg2: "#EDE6D4",
          paper: "#FFFDF7",
          ink: "#0F0F0F",
          yellow: "#FFE14D",
          red: "#FF3B30",
          green: "#2BD66A",
          blue: "#4B7BFF",
        },
      },
      fontFamily: {
        serifTc: ["var(--font-noto-serif-tc)"],
        lora: ["var(--font-lora)"],
        // Neo Brutalism 字體（新加，從 globals.css 定義 CSS 變數）
        nbSerif: ["var(--font-fraunces)", "serif"],
        nbMono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 18px 40px rgba(74, 55, 40, 0.12)",
        // Neo Brutalism 硬陰影（無模糊）
        nb: "6px 6px 0 0 #0F0F0F",
        "nb-sm": "4px 4px 0 0 #0F0F0F",
        "nb-lg": "10px 10px 0 0 #0F0F0F",
        "nb-hover": "3px 3px 0 0 #0F0F0F",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
