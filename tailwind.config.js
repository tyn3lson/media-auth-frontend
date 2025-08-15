// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}', // safe catch-all
  ],
  theme: {
    extend: {
      colors: {
        brand: 'var(--brand)',
        brandAccent: 'var(--brand-accent)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        soft: 'var(--soft)',
      },
      borderRadius: { pill: '9999px' },
      boxShadow: { pill: '0 6px 24px rgba(0,0,0,0.08)' },
    },
  },
  plugins: [],
};