/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // TrueSchools brand colors from original site
        brand: {
          blue: '#0d83dd',
          'blue-light': '#3fa9f5',
          'blue-lighter': '#caeaff',
          'blue-dark': '#0067b7',
          green: '#6cc00e',
          'green-light': '#96ec40',
          'green-lighter': '#dcffa4',
          'green-dark': '#628e0e',
          'green-text': '#65920f',
        },
        // Link colors
        link: {
          DEFAULT: '#0d83dd',
          hover: '#65920f',
        },
        // Text colors
        body: '#444',
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
      maxWidth: {
        'container': '1124px',
        'container-lg': '1200px',
      },
      borderRadius: {
        'box': '5px',
      }
    }
  },
  plugins: []
}
