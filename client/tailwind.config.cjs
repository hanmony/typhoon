/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    preflight: false,
  },
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        'primary': '#1677FF',
        'primary-bg': '#4391FD',
      },
    },
  },
  plugins: [],
};
