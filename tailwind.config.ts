import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Calibrated against the real PAINA logo: a near-black ink mark on
        // a lime-yellow swatch (lime-300 below is that exact swatch).
        ink: "#171717",
        paper: "#FBFCEF",
        surface: "#FFFFFF",
        border: "#E7E7D2",
        muted: "#6B6B63",
        lime: {
          50: "#FBFCEF",
          100: "#F4F6D7",
          200: "#EBEEAE",
          300: "#E3EA78",
          400: "#D5DD56",
          500: "#C0C93E",
          600: "#9CA62F",
          700: "#798222",
          800: "#585F18",
          900: "#383C0E",
        },
        pink: {
          50: "#FFF0F5",
          100: "#FFE0EC",
          200: "#FFC2DA",
          300: "#FF9EC4",
          400: "#FF7FB0",
          500: "#FF5C9A",
          600: "#E5417F",
          700: "#BD2F64",
          800: "#8F2149",
          900: "#641630",
        },
        sky: {
          50: "#F0FBFD",
          100: "#DEF6FA",
          200: "#BCEBF5",
          300: "#8EDCEC",
          400: "#63CBE0",
          500: "#3FB3CB",
          600: "#2E8DA3",
          700: "#246E80",
          800: "#1B5260",
          900: "#123640",
        },
        // Pineapple-body / Mario-coin gold — the warm counterpart to the
        // lime crown, used for score counters and "block" accents.
        gold: {
          50: "#FFFBEB",
          100: "#FFF3C4",
          200: "#FFE88A",
          300: "#FFDB54",
          400: "#FFC93C",
          500: "#F5B225",
          600: "#D6921A",
          700: "#A96F14",
          800: "#7C500F",
          900: "#52350A",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        diamond: "2px",
        blob: "2rem",
      },
      keyframes: {
        wobble: {
          "0%, 100%": { transform: "rotate(45deg) scale(1)" },
          "50%": { transform: "rotate(55deg) scale(1.08)" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        wobble: "wobble 0.6s ease-in-out",
        pop: "pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        float: "float 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
