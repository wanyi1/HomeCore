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
          bg: "#0B1020",
          card: "#171F30",
          cardHover: "#1E293B",
          border: "#1E293B",
          borderLight: "#334155",
          primary: "#3B82F6",
          primaryHover: "#2563EB",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          text: "#F8FAFC",
          muted: "#94A3B8",
        }
      },
      borderRadius: {
        card: "12px",
      }
    },
  },
  plugins: [],
}
