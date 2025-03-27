/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        secondary: '#818cf8',
        accent: '#fb7185',
        background: '#0f172a',
        surface: '#1e293b',
      },
    },
  },
  plugins: [],
} 