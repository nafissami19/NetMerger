/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: '#111827',
        border: '#1f2937',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb'
        }
      }
    }
  },
  plugins: []
}
