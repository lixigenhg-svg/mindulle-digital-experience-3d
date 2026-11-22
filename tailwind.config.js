/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './src/features/memorial/*.jsx'],
  theme: {
    extend: {
      colors: {
        hall: {
          wood: '#3b2c1e',
          floor: '#4a3826',
          dark: '#241d16',
          gold: '#c9a227',
          paper: '#e6d7b8',
        },
      },
      fontFamily: {
        sans: ['"Pretendard"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
