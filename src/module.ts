import { addImports, addPlugin, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import { defu } from 'defu'

// Module options TypeScript interface definition
export interface ModuleOptions {
  /** base validation timeout, @default 1500 ms */
  validationTimeout: number
  /** fingerprint baseUrl, @default '' */
  fingerprintBaseUrl: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-laravel-precognition',
    configKey: 'nuxtLaravelPrecognition',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  /** Default configuration options of the Nuxt module */
  defaults: {
    validationTimeout: 1500,
    fingerprintBaseUrl: '',
  },
  setup(options, nuxt) {
    nuxt.options.runtimeConfig.public.nuxtLaravelPrecognition = defu(
      (nuxt.options.runtimeConfig.public.nuxtLaravelPrecognition as Partial<ModuleOptions>),
      {
        validationTimeout: options.validationTimeout,
        fingerprintBaseUrl: options.fingerprintBaseUrl,
      })

    const resolver = createResolver(import.meta.url)

    nuxt.options.build.transpile.push(resolver.resolve('runtime'))

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))

    addImports([
      {
        from: resolver.resolve('runtime', 'composables', 'useForm'),
        name: 'useForm',
      },
    ])

    addTemplate({
      filename: 'types/nuxt-laravel-precognition.d.ts',
      getContents: () => [
        `import type { Client } from '${resolver.resolve('./runtime/types/core')}'`,
        '',
        'interface NuxtLaravelPrecognition {',
        '  $precognition: {',
        '    client: Client',
        '    config: {',
        '      validationTimeout: number',
        '    }',
        '  }',
        '}',
        '',
        'declare module \'#app\' {',
        '  interface NuxtApp extends NuxtLaravelPrecognition {}',
        '}',
        '',
        'declare module \'vue\' {',
        '  interface ComponentCustomProperties extends NuxtLaravelPrecognition {}',
        '}',
        '',
        'export {}',
      ].join('\n'),
    })

    nuxt.hook('prepare:types', (options) => {
      options.references.push({ path: resolver.resolve(nuxt.options.buildDir, 'types/nuxt-laravel-precognition.d.ts') })
    })
  },
})
