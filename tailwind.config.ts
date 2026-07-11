import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        md: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
    extend: {
      colors: {
        vimet: {
          orange: '#E8611A',
          red: '#C4391C',
          dark: '#1A1A1A',
          cream: '#FFF8F5',
          sand: '#FFF9F5',
          tint1: '#f8e1ce',
          tint2: '#f2d99e',
          tint3: '#e9b292',
          tint4: '#ed9755',
          tint5: '#cc751c',
          tint6: '#d94c32',
          tint7: '#c43c44',
          tint8: '#cb2820',
        },
        gray: {
          50: '#FAFAFA',
          100: '#F0F0F0',
          200: '#E5E5E5',
          300: '#B8B8B8',
          400: '#9A9A9A',
          500: '#7A7A7A',
          600: '#5A5A5A',
          700: '#4A4A4A',
          800: '#2D2D2D',
          900: '#1A1A1A',
        },
        success: '#2D8A4E',
        warning: '#D4A017',
        danger: '#C4391C',
        info: '#2563EB',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
        md: '0 4px 12px rgba(0, 0, 0, 0.1)',
        lg: '0 8px 30px rgba(0, 0, 0, 0.12)',
        xl: '0 16px 50px rgba(0, 0, 0, 0.15)',
      },
      backgroundImage: {
        'vimet-gradient': 'linear-gradient(135deg, #E8611A, #C4391C)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
}
export default config
