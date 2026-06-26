/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        bebas: ['Bebas Neue', 'sans-serif'],
        space: ['Space Mono', 'monospace'],
      },
      colors: {
        // Legacy static tokens (keep for compatibility)
        background: '#0a0a0a',
        foreground: '#ffffff',
        'card-bg': '#111111',
        'card-border': '#222222',
        // Vow type brand colors
        burn:  '#c084fc',
        rival: '#33ccff',
        cause: '#33ff99',
        // Semantic CSS-variable-backed tokens
        surface:          'var(--bg)',
        'surface-card':   'var(--bg-card)',
        'surface-raised': 'var(--bg-raised)',
        'surface-hover':  'var(--bg-hover)',
        ink:              'var(--fg)',
        'ink-muted':      'var(--fg-muted)',
        'ink-subtle':     'var(--fg-subtle)',
        line:             'var(--border)',
        'line-strong':    'var(--border-strong)',
      },
      boxShadow: {
        'glow-burn':  '0 0 20px rgba(192, 132, 252, 0.2)',
        'glow-rival': '0 0 20px rgba(51, 204, 255, 0.2)',
        'glow-cause': '0 0 20px rgba(51, 255, 153, 0.2)',
      }
    },
  },
  plugins: [],
}
