/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
    "./src/renderer/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom dark theme (Discord-like)
        background: '#1e1e2e',
        surface: '#2a2a3c',
        'surface-light': '#3a3a4c',
        'text-primary': '#cdd6f4',
        'text-secondary': '#bac2de',
        accent: '#89b4fa',
        'dm-gold': '#f9e2af',
        error: '#f38ba8',
        success: '#a6e3a1',
        warning: '#fab387',
        // Speaker colors
        'speaker-red': '#e74c3c',
        'speaker-blue': '#3498db',
        'speaker-green': '#2ecc71',
        'speaker-orange': '#f39c12',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
