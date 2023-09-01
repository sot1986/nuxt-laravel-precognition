<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: Nuxt Laravel Precognition
- Package name: @sot/nuxt-laravel-precognition
- Description: Module for Nuxt3, supporting Laravel Precognition
-->

# Nuxt Laravel Precognition

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Module for Nuxt3, supporting Laravel Precognition using native $fetch.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/@sot/nuxt-laravel-precognition?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

This is opinionated module. Although most functionalities have been replicated to work with $fetch API, there are minor differences
## Features

<!-- Highlight some of the features your module provide here -->
- base functionalities of official modules
- Better typescript support for objects with nested keys
- Added queryAs and bodyAs for sending data as FormData or URLSearchParams...

## Quick Setup

1. Add `@sot/nuxt-laravel-precognition` dependency to your project

```bash
# Using pnpm
pnpm add -D @sot/nuxt-laravel-precognition

# Using yarn
yarn add --dev @sot/nuxt-laravel-precognition

# Using npm
npm install --save-dev @sot/nuxt-laravel-precognition
```

2. Add `@sot/nuxt-laravel-precognition` to the `modules` section of `nuxt.config.ts`

```js
export default defineNuxtConfig({
  modules: [
    '@sot/nuxt-laravel-precognition'
  ]
})
```

That's it! You can now use Nuxt Laravel Precognition in your Nuxt app ✨

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with the playground
npm run dev

# Build the playground
npm run dev:build

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@sot/nuxt-laravel-precognition/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@sot/nuxt-laravel-precognition

[npm-downloads-src]: https://img.shields.io/npm/dm/@sot/nuxt-laravel-precognition.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@sot/nuxt-laravel-precognition

[license-src]: https://img.shields.io/npm/l/@sot/nuxt-laravel-precognition.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/@sot/nuxt-laravel-precognition

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
