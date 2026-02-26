import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-geist-mono)', 'monospace'],
        serif: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
      },
      colors: {
        bg:      '#F5F5F3',
        surface: '#FFFFFF',
        border: {
          DEFAULT: '#E3E3DF',
          strong:  '#C9C9C3',
        },
        text: {
          1: '#18181A',
          2: '#6B6B6B',
          3: '#ADADAD',
        },
        brand: {
          blue:   '#2563EB',
          purple: '#7C3AED',
          green:  '#16A34A',
          amber:  '#D97706',
          red:    '#DC2626',
        },
      },
      boxShadow: {
        sm:    '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
        md:    '0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)',
        lg:    '0 8px 24px rgba(0,0,0,.09), 0 4px 8px rgba(0,0,0,.04)',
        xl:    '0 20px 40px rgba(0,0,0,.12), 0 8px 16px rgba(0,0,0,.05)',
        panel: '-2px 0 16px rgba(0,0,0,.07)',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg:      '12px',
        xl:      '16px',
      },
      keyframes: {
        spin:   { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        fadein: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'spin-slow': 'spin 1.2s linear infinite',
        fadein:      'fadein .18s ease',
      },
    },
  },
  plugins: [],
}

export default config
