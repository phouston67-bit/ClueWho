import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f5ff",
          100: "#e1e9ff",
          200: "#c3d3ff",
          300: "#9cb3ff",
          400: "#7088ff",
          500: "#4a5dff",
          600: "#3640f0",
          700: "#2c30c4",
          800: "#272a9b",
          900: "#24287c",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "pop": "pop 0.25s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pop: {
          "0%": { transform: "scale(0.95)" },
          "60%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
