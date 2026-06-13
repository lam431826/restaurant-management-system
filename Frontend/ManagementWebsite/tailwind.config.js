/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        forum: ['Forum', 'serif'],
        'bitter-rose': ['"Bitter Rose"', '"Great Vibes"', 'cursive'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#2563EB',
      },
    },
  },
  plugins: [],
}
