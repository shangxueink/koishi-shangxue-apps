/** @type {import('tailwindcss').Config} */
const path = require('path')

module.exports = {
  content: [
    path.resolve(__dirname, './client/*.{vue,js,ts,jsx,tsx}'),
    path.resolve(__dirname, './client/icons/**/*.{vue,js,ts,jsx,tsx}'),
    path.resolve(__dirname, './client/vue/**/*.{vue,js,ts,jsx,tsx}'),
    path.resolve(__dirname, './client/web/src/**/*.{vue,js,ts,jsx,tsx}'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  important: true,
}
