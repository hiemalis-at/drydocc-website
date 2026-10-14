/*
 * The Tailwind (CDN) theme every page shares: fonts, the CSS-variable-backed
 * palette tokens (set on <html>, so a single `dark` class flips every
 * token) and the scroll-nudge animation. A classic script, loaded right
 * after the Tailwind CDN script.
 */
tailwind.config = {
  darkMode: 'selector',
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        teal: 'rgb(var(--c-teal) / <alpha-value>)',
        dockblue: 'rgb(var(--c-dockblue) / <alpha-value>)',
        hardhat: 'rgb(var(--c-hardhat) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        term: 'rgb(var(--c-term) / <alpha-value>)',
        'term-ink': 'rgb(var(--c-term-ink) / <alpha-value>)',
        navy: 'rgb(var(--c-navy) / <alpha-value>)',
        wash: 'rgb(var(--c-wash) / <alpha-value>)'
      },
      keyframes: {
        'scroll-nudge': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(6px)' }
        }
      },
      animation: {
        'scroll-nudge': 'scroll-nudge 1.2s steps(2, jump-none) infinite'
      }
    }
  }
};
