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
        background: '#0a0a0a',
        foreground: '#ffffff',
        'card-bg': '#111111',
        'card-border': '#222222',
        burn: '#ff3333',
        rival: '#33ccff',
        cause: '#33ff99',
      },
      boxShadow: {
        'glow-burn': '0 0 20px rgba(255, 51, 51, 0.2)',
        'glow-rival': '0 0 20px rgba(51, 204, 255, 0.2)',
        'glow-cause': '0 0 20px rgba(51, 255, 153, 0.2)',
      }
    },
  },
  plugins: [],
}
