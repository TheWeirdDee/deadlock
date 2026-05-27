/**
 * PostCSS configuration for the Deadlock Next.js app.
 *
 * Plugin execution order matters:
 *  1. `tailwindcss`   — generates utility classes from the design token system
 *                       defined in tailwind.config.js (scans src/** for class usage)
 *  2. `autoprefixer`  — adds vendor prefixes to CSS rules for browser compatibility
 *                       (e.g. -webkit-transform, -moz-appearance)
 *
 * Why .cjs (CommonJS)?
 *   Next.js 14 defaults to ESM for .js files when `"type": "module"` is set in
 *   package.json. postcss-loader requires a CommonJS config file, so we use
 *   the .cjs extension to force CJS evaluation regardless of project module type.
 */
module.exports = {
  plugins: {
    tailwindcss: {},    // Must come before autoprefixer
    autoprefixer: {},   // Adds browser compatibility prefixes
  },
};
