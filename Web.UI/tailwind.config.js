/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  // Support for dark mode via the .egret-navy-dark class
  darkMode: ['class', '.egret-navy-dark'],
  theme: {
    extend: {
      colors: {
        secondary: 'rgb(var(--fg-secondary))',
        // Background and foreground colors
        bg: {
          base: 'rgb(var(--bg-base))',
          card: 'rgb(var(--bg-card))',
          dialog: 'rgb(var(--bg-dialog))',
          hover: 'rgba(var(--bg-hover))',
        },
        fg: {
          base: 'rgba(var(--fg-base))',
          secondary: 'rgba(var(--fg-secondary))',
          hint: 'rgba(var(--fg-hint))',
          divider: 'rgba(var(--fg-divider))',
        },
        // Sidebar theme colors
        'sidebar': {
          bg: 'rgb(var(--sidebar-bg))',
          text: 'rgb(var(--sidebar-text))',
        }
      },
      // Screen breakpoints that match Angular Material's breakpoints
      screens: {
        xs: '0px',
        sm: '600px',
        md: '960px',
        lg: '1280px',
        xl: '1920px',
      },
      // Custom spacing for consistent layout
      spacing: {
        '1/2': '50%',
        '1/3': '33.333333%',
        '2/3': '66.666667%',
        '1/4': '25%',
        '2/4': '50%',
        '3/4': '75%',
        '1/5': '20%',
        '2/5': '40%',
        '3/5': '60%',
        '4/5': '80%',
        '1/12': '8.333333%',
        '2/12': '16.666667%',
        '3/12': '25%',
        '4/12': '33.333333%',
        '5/12': '41.666667%',
        '6/12': '50%',
        '7/12': '58.333333%',
        '8/12': '66.666667%',
        '9/12': '75%',
        '10/12': '83.333333%',
        '11/12': '91.666667%',
      },
      // Customized font families to match Egret
      fontFamily: {
        sans: ['var(--font-family-base)'],
        mono: ['var(--font-family-mono)'],
      },
      // Add useful box shadows that match Material Design elevations
      boxShadow: {
        sm: 'var(--shadow-1)',
        md: 'var(--shadow-2)',
        lg: 'var(--shadow-3)',
        xl: 'var(--shadow-4)',
        '2xl': 'var(--shadow-5)',
        card: 'var(--shadow-card)',
        DEFAULT: 'var(--shadow-2)'
      },
    },
  },
  plugins: [],
  // Add variants for dark mode and other states
  variants: {
    extend: {
      backgroundColor: ['dark', 'hover', 'focus', 'disabled'],
      textColor: ['dark', 'hover', 'focus', 'disabled'],
      borderColor: ['dark', 'hover', 'focus', 'disabled'],
      opacity: ['dark', 'hover', 'focus', 'disabled'],
    },
  },
};