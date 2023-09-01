export default defineNuxtConfig({
  modules: ['../src/module'],
  laravelPrecognition: {},
  devtools: { enabled: true },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  css: ['~/assets/css/main.css'],
})
