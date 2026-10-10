/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hc: {
          bg: "#0A0F1D",
          surface: "#10172A",
          card: "#131C31",
          cardHover: "#19243E",
          cardElevated: "#1D2B4A",
          border: "#1E2D4A",
          borderLight: "#2C3E64",
          borderGlow: "rgba(59, 130, 246, 0.3)",
          primary: "#3B82F6",
          primaryHover: "#2563EB",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          text: "#F8FAFC",
          muted: "#94A3B8",
          subtle: "#64748B",
          living: {
            amber: "#F59E0B",
            indigo: "#6366F1",
            emerald: "#10B981",
            rose: "#F43F5E",
            purple: "#A855F7",
            cyan: "#06B6D4",
          }
        }
      },
      borderRadius: {
        card: "16px",
        "card-lg": "20px",
        btn: "10px",
      },
      boxShadow: {
        card: "0 8px 24px -4px rgba(0, 0, 0, 0.45)",
        cardHover: "0 12px 32px -4px rgba(0, 0, 0, 0.65)",
        glowBlue: "0 0 25px -5px rgba(59, 130, 246, 0.35)",
        glowAmber: "0 0 25px -5px rgba(245, 158, 11, 0.35)",
        glowEmerald: "0 0 25px -5px rgba(16, 185, 129, 0.35)",
      }
    },
  },
  plugins: [],
}
