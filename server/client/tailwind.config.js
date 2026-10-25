/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dept: {
          cse: '#3b82f6',
          it: '#06b6d4',
          ece: '#8b5cf6',
          eee: '#f59e0b',
          mech: '#ef4444',
          civil: '#10b981',
          aids: '#ec4899',
        }
      }
    },
  },
  plugins: [],
}
