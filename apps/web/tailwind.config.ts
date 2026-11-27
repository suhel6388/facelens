import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#08090D",
        surface: "#101218",
        card: "#151821",
        elevated: "#1B202B",
        border: "#252A35",
        primary: {
          DEFAULT: "#E94B78",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#6575FF",
          foreground: "#FFFFFF",
        },
        foreground: "#FFFFFF",
        muted: {
          DEFAULT: "#9CA3AF",
          foreground: "#9CA3AF",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
        input: "9px",
      },
      spacing: {
        sidebar: "248px",
      },
      maxWidth: {
        shell: "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
