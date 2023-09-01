import { addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import { defu } from 'defu'

// Module options TypeScript interface definition
export interface ModuleOptions {
  /** base validation timeout, @default 1000 ms */
  validationTimeout: number
  /** fingerprint baseUrl, @default '' */
  fingerprintBaseUrl: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'laravel-precognition',
    configKey: 'laravelPrecognition',
    compatibility: {
      nuxt: '^3.0.0',
    },
  },
  /** Default configuration options of the Nuxt module */
  defaults: {
    validationTimeout: 1000,
    fingerprintBaseUrl: '',
  },
  setup(options, nuxt) {
    nuxt.options.runtimeConfig.public.laravelPrecognition = defu(
      (nuxt.options.runtimeConfig.public.laravelPrecognition as Partial<ModuleOptions>),
      {
        validationTimeout: options.validationTimeout,
        fingerprintBaseUrl: options.fingerprintBaseUrl,
      })

    const resolver = createResolver(import.meta.url)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))

    addImports([
      {
        from: resolver.resolve('runtime', 'composables', 'useForm'),
        name: 'useForm',
      },
    ])
  },
})
