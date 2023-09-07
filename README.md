<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: Nuxt Laravel Precognition
- Package name: nuxt-laravel-precognition
- Description: Module for Nuxt3, supporting Laravel Precognition
-->

# Nuxt Laravel Precognition

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Module for Nuxt3, supporting Laravel Precognition using native $fetch.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/nuxt-laravel-precognition?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

This is opinionated module. Although most functionalities have been replicated to work with $fetch API, there are minor differences
## Features

<!-- Highlight some of the features your module provide here -->
- base functionalities of official modules
- Better typescript support for objects with nested keys
- Added queryAs and bodyAs for sending data as FormData or URLSearchParams...

## Quick Setup

1. Add `nuxt-laravel-precognition` dependency to your project

```bash
# Using pnpm
pnpm add -D nuxt-laravel-precognition

# Using yarn
yarn add --dev nuxt-laravel-precognition

# Using npm
npm install --save-dev nuxt-laravel-precognition
```

2. Add `nuxt-laravel-precognition` to the `modules` section of `nuxt.config.ts`

```js
export default defineNuxtConfig({
  modules: [
    'nuxt-laravel-precognition'
  ]
})
```

3. Create one plugin where you initialize the $fetch client, and then use it as precognition client:

```typescript
import { defineNuxtPlugin, useCookie, useNuxtApp } from '#app'

export default defineNuxtPlugin(() => {
  function getCsrfToken() {
    // grab sanctum headers
    return useCookie('XSRF-TOKEN', { default: () => '' }).value
  }

  function mergeHeaders(options: { headers?: HeadersInit }, newHeaders: HeadersInit) {
    const headersToBeMerged = new Headers(newHeaders) // cast newHeaders to Headers instance

    // check if request has headers to be merged with newHeaders
    if (!options.headers) { 
      options.headers = headersToBeMerged
      return
    }

    options.headers = new Headers(options.headers) // cast requestHeaders to Headers instance

    // merge the newHeaders with requestHeaders
    Array.from([...headersToBeMerged.entries()]).forEach(([key, value]) => {
      (options.headers as Headers).set(key, value)
    })
  }

  const api = $fetch.create({
    baseURL: 'http://localhost',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
    onRequest: ({ options }) => {
      const csrfToken = getCsrfToken() // read sanctum csrf token

      if (!csrfToken)
        return

      mergeHeaders(options,  ['X-XSRF-TOKEN', csrfToken]) // attach the csrf token as X-XSRF-TOKEN header
    },
  })

  const { $precognition } = useNuxtApp()

  $precognition.client.use(api)

  function fetchCsrfToken() {
    return api('/sanctum/csrf-cookie')
  }

  return {
    provide: {
      api,
      fetchCsrfToken,
    },
  }
})
```

4. Remember to expose laravel Precognition Headers in your config/cors.php laravel file:

```php
return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    */

    'paths' => ['*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [env('FRONTEND_URL', 'http://localhost:3000')],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Precognition', 'Precognition-Success'],

    'max_age' => 0,

    'supports_credentials' => true,

];
```

5. You can use the useForm composable that is autoimported by this module.

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-laravel-precognition/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/nuxt-laravel-precognition

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-laravel-precognition.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/nuxt-laravel-precognition

[license-src]: https://img.shields.io/npm/l/nuxt-laravel-precognition.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/nuxt-laravel-precognition

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
