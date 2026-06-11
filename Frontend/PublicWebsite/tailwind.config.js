/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.6s ease-out both',
      },
      colors: {
        'brand-bg': '#0a0b0a',
        'brand-text': '#efe7d2',
        'brand-gold': '#face8d',
        'brand-muted': 'rgba(24,24,24,0.5)',
        'brand-border': 'rgba(239,231,210,0.15)',
      },
      fontFamily: {
        forum: ['Forum', 'serif'],
        satoshi: ['MJ Satoshi', 'sans-serif'],
        'bitter-rose': ['Bitter Rose', 'cursive'],
      },
      letterSpacing: {
        widest2: '3px',
      },
    },
  },
  plugins: [],
}
