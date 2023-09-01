export default defineNuxtConfig({
  modules: ['../src/module'],
  nuxtLaravelPrecognition: {},
  devtools: { enabled: true },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  css: ['~/assets/css/main.css'],
})
