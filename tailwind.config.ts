import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // 👈 enable dark mode via <html class="dark">
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        gray: "var(--app-gray)",
        accent: "var(--app-accent)",
        burnie: {
          accent: "#ff4500", // 🔥 Burnie orange
          background: "#0b0e14", // dark background base
        },
      },
      animation: {
        "fade-out": "fadeOut 1s 3s ease-out forwards",
      },
      keyframes: {
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
