import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { createPage, setup } from '@nuxt/test-utils'

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    server: true,
    browser: true,
    browserOptions: { type: 'chromium' },
  })

  test('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.

    const page = await createPage('/')

    const txt = await page.textContent('h1')
    expect(txt).toBe('Test')

    await page.type('#title', 'Ciao')

    const name = await page.inputValue('#title')
    expect(name).toBe('Ciao')
  })
})
