// Docs: Tailwind configuration notes for Deadlock UI
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom typography configs
      fontFamily: {
        bebas: ['Bebas Neue', 'sans-serif'],
        space: ['Space Mono', 'monospace'],
      },
      // Customized brand color palettes representing vow states
      colors: {
        background: '#0a0a0a',
        foreground: '#ffffff',
        'card-bg': '#111111',
        'card-border': '#222222',
        // Purple theme for burn type vows
        burn: '#c084fc',
        // Cyan theme for rival vows
        rival: '#33ccff',
        // Green theme for cause vows
        cause: '#33ff99',
      },
      // Box glow neon shadows mapping to vow outcomes
      boxShadow: {
        'glow-burn': '0 0 20px rgba(192, 132, 252, 0.2)',
        'glow-rival': '0 0 20px rgba(51, 204, 255, 0.2)',
        'glow-cause': '0 0 20px rgba(51, 255, 153, 0.2)',
      }
    },
  },
  plugins: [],
}
