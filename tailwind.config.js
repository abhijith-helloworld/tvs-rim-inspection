/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#d4af37",
        dark: "#0f1419",
        "dark-card": "#1a2029",
        "dark-lighter": "#2d3748",
        "industrial-cyan": {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
      },

      fontFamily: {
        inter: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        roboto: ["Roboto", "system-ui", "sans-serif"],
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%,100%": {
            opacity: "1",
            boxShadow: "0 0 20px currentColor",
          },
          "50%": {
            opacity: "0.7",
            boxShadow: "0 0 40px currentColor",
          },
        },
      },

      animation: {
        "fade-in": "fadeIn 0.4s ease-in-out",
        scan: "scan 2s linear infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
      },

      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.2)",
        glow: "0 0 20px rgba(34,211,238,0.35)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
