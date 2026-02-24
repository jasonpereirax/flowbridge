/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      colors: {
        surface: '#FFFFFF',
        bg: '#F5F5F3',
        border: {
          DEFAULT: '#E3E3DF',
          2: '#C9C9C3',
        },
        text: {
          1: '#18181A',
          2: '#6B6B6B',
          3: '#ADADAD',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04)',
        md: '0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)',
        lg: '0 8px 24px rgba(0,0,0,.1), 0 4px 8px rgba(0,0,0,.05)',
        xl: '0 20px 40px rgba(0,0,0,.12), 0 8px 16px rgba(0,0,0,.05)',
      },
    },
  },
  plugins: [],
}
