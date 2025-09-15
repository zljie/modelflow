// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-15',
  devtools: { enabled: true },
  modules: [
    '@element-plus/nuxt',
    '@pinia/nuxt'
  ],
  css: ['~/assets/css/main.css'],
  ssr: false,
  typescript: {
    typeCheck: false
  }
})
