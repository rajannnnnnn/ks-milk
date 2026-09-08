/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        cream: {
          50: "#fffdf8",
          100: "#fdf6e9",
          200: "#f9ecce",
          300: "#f2dda3",
        },
        moss: {
          50: "#f2f7f0",
          100: "#dfebd9",
          200: "#bcd6b0",
          300: "#93bc80",
          400: "#6d9f57",
          500: "#4f8038",
          600: "#3d652b",
          700: "#325023",
          800: "#2a4020",
          900: "#24361d",
          950: "#101d0d",
        },
        clay: {
          50: "#fdf4ef",
          100: "#fbe6da",
          200: "#f5c8ac",
          300: "#eda476",
          400: "#e37e49",
          500: "#d9612b",
          600: "#c04a1f",
          700: "#9f391b",
          800: "#7f2f1b",
          900: "#672919",
        },
        ink: {
          50: "#f5f6f4",
          100: "#e6e8e3",
          400: "#767d70",
          600: "#454c40",
          800: "#2a2f27",
          900: "#1b1f18",
          950: "#0e110c",
        },
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgb(27 31 24 / 0.08), 0 8px 24px -8px rgb(27 31 24 / 0.10)",
        lift: "0 8px 30px -8px rgb(27 31 24 / 0.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
