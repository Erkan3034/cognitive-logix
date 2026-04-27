/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        tower: {
          bg: "#101725",
          card: "#1E293B",
          line: "#334155",
          mint: "#22c55e",
          amber: "#f59e0b",
          rose: "#ef4444",
          cyan: "#22d3ee",
        },
      },
    },
  },
  plugins: [],
};
