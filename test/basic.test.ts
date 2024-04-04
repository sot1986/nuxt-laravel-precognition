import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const html = await $fetch('/')
    expect(html).toContain('<h1>Test</h1>')
  })
})
