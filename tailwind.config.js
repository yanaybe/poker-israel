/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          950: '#05100a',
          900: '#091809',
          800: '#0d2212',
          700: '#132a18',
          600: '#1a3822',
          500: '#234d2e',
          400: '#2d6a3e',
          300: '#3a8a52',
          200: '#52b870',
          100: '#87d49e',
        },
        gold: {
          50: '#fdf9ec',
          100: '#faf0cb',
          200: '#f5df97',
          300: '#efca57',
          400: '#e8b52a',
          500: '#c9971e',
          600: '#a87a18',
          700: '#865f14',
          800: '#644710',
          900: '#42300b',
        },
        poker: {
          bg: '#07110a',
          card: '#0c1c10',
          border: '#1a3322',
          hover: '#102016',
          text: '#dceade',
          muted: '#7a9c82',
          subtle: '#4a6450',
        },
        hearts: '#e05252',
        diamonds: '#e05252',
        spades: '#e8f0ea',
        clubs: '#e8f0ea',
      },
      fontFamily: {
        sans: ['var(--font-heebo)', 'Heebo', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'felt-radial': 'radial-gradient(ellipse at center, #162a1c 0%, #0a1810 55%, #050f08 100%)',
        'card-gradient': 'linear-gradient(145deg, #0e1f13 0%, #091409 100%)',
        'gold-gradient': 'linear-gradient(135deg, #efca57 0%, #c9971e 50%, #a87a18 100%)',
        'chip-gradient': 'radial-gradient(circle, #234d2e 0%, #0d2212 100%)',
        'hero-gradient': 'linear-gradient(180deg, #091809 0%, #050f08 100%)',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(201, 151, 30, 0.3)',
        'gold-lg': '0 0 40px rgba(201, 151, 30, 0.4)',
        'felt': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'card': '0 2px 10px rgba(0, 0, 0, 0.4)',
        'inner-gold': 'inset 0 1px 0 rgba(201, 151, 30, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseGold: { '0%, 100%': { boxShadow: '0 0 10px rgba(201, 151, 30, 0.2)' }, '50%': { boxShadow: '0 0 25px rgba(201, 151, 30, 0.5)' } },
      },
    },
  },
  plugins: [],
}
