/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'harx': {
          50: '#fff5f5',
          100: '#ffe0e0',
          200: '#ffc2c2',
          300: '#ff9494',
          400: '#ff6b6b',
          500: '#ff4d4d', // Primary HARX red-orange
          600: '#ff3333',
          700: '#ff1a1a',
          800: '#ff0000',
          900: '#cc0000',
          950: '#990000',
        },
        'harx-alt': {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899', // Secondary HARX pink
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
        'bounce-slow': 'bounce 3s infinite',
        'float': 'float 6s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backgroundImage: {
        'gradient-harx': 'linear-gradient(to right, #ff4d4d, #ec4899)',
        'premium-gradient': 'radial-gradient(circle at top left, #fff5f5 0%, #ffffff 100%)',
      },
    },
  },
  plugins: [],
};
