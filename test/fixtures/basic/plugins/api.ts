import { defineNuxtPlugin, useCookie, useNuxtApp } from '#imports'

export default defineNuxtPlugin(() => {
  function getCsrfToken() {
    return useCookie('XSRF-TOKEN', { default: () => '' }).value
  }

  function addHeader(options: { headers?: HeadersInit }, key: string, value: string) {
    if (options.headers instanceof Headers) {
      options.headers.append(key, value)
      return
    }

    if (Array.isArray(options.headers)) {
      options.headers.push([key, value])
      return
    }

    options.headers = { ...options.headers, [key]: value }
  }

  const api = $fetch.create({
    baseURL: 'http://localhost',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
    onRequest: ({ options }) => {
      const csrfToken = getCsrfToken()

      if (!csrfToken)
        return

      addHeader(options, 'X-XSRF-TOKEN', csrfToken)
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
