import type { FetchResponse } from 'ofetch'
import type { ModuleOptions } from '../module'
import type { Client, Config } from './types/core'
import { assertIsFetchResponse, assertIsServerGeneratedError, isFetchResponse, isSuccess, mergeConfig, resolveConfig, resolveStatusHandler, validatePrecognitionResponse } from './utils/core'
import { defineNuxtPlugin, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin((_nuxtApp) => {
  const precognitionConfig = useRuntimeConfig().public.nuxtLaravelPrecognition as ModuleOptions

  /**
    * The configured axios client.
    */
  let fetchClient: typeof $fetch | null = null

  function getClient() {
    return fetchClient ?? $fetch.create({})
  }

  /**
   * Determine if the status is successful precognition.
   */
  let successResolver = (response: FetchResponse<unknown>) => {
    return response.status === 204 && response.headers.get('precognition-success') === 'true'
  }

  /**
   * Send and handle a new request.
   */
  async function request(url: string, userConfig: Config): Promise<unknown> {
    const config = resolveConfig(userConfig)

    if ((config.onBefore ?? (() => true))() === false)
      return Promise.resolve(null)

    if (config.onStart)
      config.onStart()

    try {
      const response = await getClient().raw(url, config)

      if (config.precognitive)
        validatePrecognitionResponse(response)

      const { status } = response

      let payload: unknown = response

      assertIsFetchResponse(payload, 'Expected to receive FetchResponse')

      if (config.precognitive && config.onPrecognitionSuccess && successResolver(payload))
        payload = await Promise.resolve(config.onPrecognitionSuccess(payload) ?? payload)

      if (config.onSuccess && isSuccess(status)) {
        assertIsFetchResponse(payload, 'Expected to receive FetchResponse for onSuccess handler')
        payload = await Promise.resolve(config.onSuccess(payload) ?? payload)
      }

      const statusHandler = resolveStatusHandler(config, status)
        ?? (response => response)

      payload = isFetchResponse(payload) ? statusHandler(payload) : payload

      return isFetchResponse(payload) ? payload._data : payload
    }
    catch (error) {
      assertIsServerGeneratedError(error)

      if (config.precognitive)
        validatePrecognitionResponse(error.response)

      const statusHandler = resolveStatusHandler(config, error.response.status)
            ?? ((_, error) => Promise.reject(error))

      return statusHandler(error.response, error)
    }
    finally {
      if (config.onFinish)
        config.onFinish()
    }
  }

  /**
 * The precognitive HTTP client instance.
 */
  const client: Client = {
    get: (url, data = {}, config = {}) => request(url, mergeConfig('get', data, config)),
    post: (url, data = {}, config = {}) => request(url, mergeConfig('post', data, config)),
    patch: (url, data = {}, config = {}) => request(url, mergeConfig('patch', data, config)),
    put: (url, data = {}, config = {}) => request(url, mergeConfig('put', data, config)),
    delete: (url, data = {}, config = {}) => request(url, mergeConfig('delete', data, config)),
    use(custom) {
      fetchClient = custom

      return client
    },
    client: () => getClient(),
    determineSuccessUsing(callback) {
      successResolver = callback

      return client
    },
  }

  return {
    provide: {
      precognition: {
        client,
        config: precognitionConfig,
      },
    },
  }
})
