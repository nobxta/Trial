import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'ui-monospace', 'monospace'],
        stepper: ['Chakra Petch', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: "#0b0f1a",
        card: "#12182a",
        cardLight: "#1a2140",
        accent: {
          DEFAULT: "#2dd4ff",
          dark: "#0ea5e9",
        },
        textMuted: "#9ca3af",
        background: {
          DEFAULT: "#0a0e27",
          secondary: "#141932",
          tertiary: "#1e2442",
        },
        text: {
          primary: "#ffffff",
          secondary: "#cbd5e1",
          muted: "#94a3b8",
        },
        border: {
          DEFAULT: "#1e293b",
          light: "#334155",
          glow: "rgba(59, 130, 246, 0.3)",
        },
        success: "#10b981",
        danger: "#ef4444",
        warning: "#f59e0b",
      },
    },
  },
  plugins: [],
};
export default config;

