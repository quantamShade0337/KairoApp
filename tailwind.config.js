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
        display: ['var(--font-bebas)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
        sans: ['var(--font-syne)', 'sans-serif'],
      },
      colors: {
        g2: '#aaaaaa',
        g3: '#555555',
        g4: '#1e1e1e',
        g5: '#0d0d0d',
      },
    },
  },
  plugins: [],
}
