/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas:      '#0c1013',
        surface:     '#0f1416',
        sidebar:     '#101416',
        elevated:    '#181f23',
        subtle:      '#1f272c',
        border:      '#1b2327',
        borderHover: '#29363d',
        muted:       '#526068',
        nvidia: {
          DEFAULT:  '#76b900',
          bright:   '#8bd000',
          dark:     '#5a8c00',
          glow:     'rgba(118,185,0,0.15)',
        },
        accent: {
          blue:   '#0a84ff',
          purple: '#bf5af2',
          teal:   '#30d158',
          orange: '#ff9f0a',
          red:    '#ff453a',
          pink:   '#ff375f',
        },
        diagnostic: {
          amber:   '#ff9f0a',
          crimson: '#ff453a',
          purple:  '#bf5af2',
          info:    '#0a84ff',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        'xs':  ['11px', '15px'],
        'sm':  ['12px', '16px'],
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 150ms ease',
        'slide-up': 'slideUp 200ms cubic-bezier(0.4,0,0.2,1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'inner-top':  'inset 0 1px 0 rgba(255,255,255,0.04)',
        'glow-green': '0 0 12px rgba(118,185,0,0.2)',
        'glow-blue':  '0 0 12px rgba(10,132,255,0.2)',
        'panel':      '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
}
