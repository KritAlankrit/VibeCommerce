/** @type {import('tailwindcss').Config} */
    module.exports = {
      // tell tailwind where to look for classes
      content: [
        "./src/**/*.{js,jsx,ts,tsx}",
      ],
      theme: {
        extend: {
          fontFamily: {
            // set up 'Inter' as the default sans-serif font
            sans: ['Inter', 'sans-serif'],
          },
        },
      },
      plugins: [],
    }