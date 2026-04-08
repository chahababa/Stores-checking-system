import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F5ECD7",
        warm: "#C97B3A",
        ink: "#4A3728",
        soft: "#E8D5B7",
        success: "#27AE60",
        warning: "#F39C12",
        danger: "#C0392B",
      },
      fontFamily: {
        serifTc: ["var(--font-noto-serif-tc)"],
        lora: ["var(--font-lora)"],
      },
      boxShadow: {
        card: "0 18px 40px rgba(74, 55, 40, 0.12)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
