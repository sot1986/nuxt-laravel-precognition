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
  typescript: {
    typeCheck: true,
    strict: true,
  },
  css: ['~/assets/css/main.css'],
})
