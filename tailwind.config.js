/** @type {import('tailwindcss').Config} */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
const scale = (p, keys) => Object.fromEntries(keys.map((k) => [k, v(`${p}-${k}`)]));
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter Variable"', '"Noto Sans Devanagari"', '"Noto Sans Telugu"', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        // Neutrals and brand are CSS variables so one class set renders both the light and the dark theme.
        slate: scale('slate', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        brand: scale('brand', [50, 100, 200, 300, 400, 500, 600, 700, 800]),
        ink: { 900: v('slate-900'), 700: v('slate-700'), 500: v('slate-500'), 400: v('slate-400') },
      },
      fontSize: { '2xs': ['11px', '16px'] },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        glow: '0 8px 24px -8px rgb(99 102 241 / .55)',
      },
    },
  },
  plugins: [],
};
