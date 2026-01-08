/** @type {import('tailwindcss').Config} */
const { heroui } = require('@heroui/react');
const plugin = require('tailwindcss-animate');
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
    '../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}', // NextUI theme
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        violet: {
          50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD',
          400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED',
          700: '#6D28D9', 800: '#5B21B6', 900: '#4C1D95',
        },
        // Legacy mappings to new violet system
        brand: {
          primary: '#7C3AED', // Violet 600
          primaryDark: '#5B21B6', // Violet 800
          soft: '#F5F3FF', // Violet 50
          gradientStart: '#8B5CF6', // Violet 500
          gradientEnd: '#6D28D9', // Violet 700
        },
        // Apple-inspired Greys (Keep for compatibility)
        apple: {
          50: '#F5F5F7', 100: '#E5E5EA', 200: '#D1D1D6',
          300: '#C7C7CC', 400: '#AEAEB2', 500: '#8E8E93',
          600: '#636366', 900: '#1C1C1E',
        },
        border: 'var(--border)',
        ignore: 'var(--ignore)',
        desc: 'var(--desc)',
        hover: 'var(--hover)',
        input: 'var(--input)',
        tag: 'var(--tag)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        secondbackground: 'var(--secondbackground)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: '#7C3AED', // Violet 600
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#F5F3FF', // Violet 50
          foreground: '#7C3AED', // Violet 600
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        header: 'var(--header)'
      },
      spacing: {
        '90': '90px',
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: 'calc(var(--radius) - 4px)',
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        full: '9999px',
      },
      boxShadow: {
        'float': '0 20px 50px -12px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.1)',
        'float-hover': '0 30px 60px -12px rgba(99, 102, 241, 0.15), 0 0 1px rgba(0,0,0,0.1)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glow': '0 0 60px -15px rgba(124, 58, 237, 0.5)',
        'inner-light': 'inset 0 1px 0 0 rgba(255,255,255,0.7), inset 0 0 20px 0 rgba(255,255,255,0.1)',
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(15px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'breath': {
          '0%': { opacity: '0.5', transform: 'scale(0.95)' },
          '100%': { opacity: '0.8', transform: 'scale(1.05)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards',
        'breath': 'breath 8s ease-in-out infinite alternate',
      },
    },
  },
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|background|primary)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern: /^(bg-(?:background|primary)\/[0-9]+)$/,
      variants: ['hover'],
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ['hover', 'ui-selected'],
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ],
  plugins: [
    require('tailwindcss-animate'),
    require('@headlessui/tailwindcss'),
    require('@tailwindcss/typography'),
    heroui({
      prefix: 'heroui',
      addCommonColors: false,
      defaultTheme: 'light',
      defaultExtendTheme: 'light',
      layout: {},
      themes: {
        light: {
          layout: {},
          colors: {
          },
        },
        dark: {
          layout: {},
          colors: {
          },
        },
      },
    })
  ],
};
