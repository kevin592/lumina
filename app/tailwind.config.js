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
      },
      colors: {
        // Apple-inspired Greys (System Gray 6 Base)
        apple: {
          50: '#F5F5F7',  // Main background
          100: '#E5E5EA', // Secondary
          200: '#D1D1D6', // Borders
          300: '#C7C7CC', // Disabled
          400: '#AEAEB2', // Subtitles
          500: '#8E8E93', // Tertiary
          600: '#636366', // Body
          900: '#1C1C1E', // Headings
        },
        // Google/Material You inspired Accents
        google: {
          primary: '#6750A4', // M3 Purple
          primaryContainer: '#EADDFF',
          onPrimaryContainer: '#21005D',
          secondary: '#625B71',
          secondaryContainer: '#E8DEF8',
          blue: '#D2E3FC',
          blueDark: '#174EA6',
          green: '#C4EED0',
          greenDark: '#0D652D',
          yellow: '#FEF7E0',
        },
        // Legacy Brand (Mapped to New Google Primary)
        brand: {
          primary: '#6750A4',
          primaryDark: '#21005D',
          soft: '#F3E8FF',
          gradientStart: '#6750A4',
          gradientEnd: '#7C3AED',
        },
        // Surface colors (Updated to Apple 50/White)
        surface: {
          main: '#F5F5F7',
          card: '#FFFFFF',
          input: '#E5E5EA',
        },
        gray: {
          50: '#F5F5F7',
          100: '#E5E5EA',
          200: '#D1D1D6',
          300: '#C7C7CC',
          400: '#AEAEB2',
          500: '#8E8E93',
          600: '#636366',
          700: '#48484A',
          800: '#2C2C2E',
          900: '#1C1C1E',
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
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
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
        '2xl': '20px',
        '3xl': '24px', // V8 Extra Rounded
        '4xl': '32px',
      },
      // Apple-inspired Shadow System
      boxShadow: {
        subtle: '0 2px 10px rgba(0,0,0,0.03)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
        float: '0 20px 40px -10px rgba(0,0,0,0.1)',
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        glow: '0 0 15px rgba(103, 80, 164, 0.3)', // Updated to Google Purple
        soft: '0 4px 20px rgba(0, 0, 0, 0.03)',
        hover: '0 10px 25px rgba(103, 80, 164, 0.15)', // Updated to Google Purple
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
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
