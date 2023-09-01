import { URLSearchParams } from 'node:url'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { FetchResponse } from 'ofetch'
import { FetchError } from 'ofetch'
import {
  assertIsServerGeneratedError,
  getHeaders,
  hasFiles,
  isSuccess,
  mergeConfig,
  resolveConfig,
  resolveInitialData,
  resolveStatusHandler,
  resolveString,
  setHeaders,
  validatePrecognitionResponse,
} from '../../src/runtime/utils/core'
import {
  resolveName,
  toSimpleValidationErrors,
  toValidationErrors,
} from '../../src/runtime/utils/validator'
import type {
  Client,
  Config,
  NamedInputEvent,
  SimpleValidationErrors,
  ValidationErrors,
} from '../../src/runtime/types/core'
import plugin from '../../src/runtime/plugin'

const myPlugin = plugin as unknown as {
  precognition: {
    client: Client
  }
}

let parameters: [string] | [string, Config] = ['']
let response: FetchResponse<unknown> | null = null
let error: FetchError | null = null

function dummyFetch(...params: [string] | [string, Config]): Promise<FetchResponse<unknown>> {
  parameters = [...params]

  return new Promise<FetchResponse<unknown>>((resolve, reject) => {
    if (error) {
      reject(error)
      return
    }

    resolve(response ?? new Response())
  })
}

const mockFetch = {
  raw: dummyFetch,
  name: 'mockFetch',
} as typeof $fetch

function makeResponse(payload: { status: number; data?: unknown; headers?: Headers }) {
  const resp = new Response(null, { status: payload.status, headers: payload.headers }) as FetchResponse<unknown>
  resp._data = payload.data ?? undefined
  return resp
}

function setClientData(
  resp?: { data?: unknown; headers?: Headers; status: number },
  err?: { message: string; status: number; data?: unknown; headers?: Headers }) {
  if (err) {
    error = new FetchError(err.message)
    error.response = makeResponse(err)
    response = null
    return
  }

  error = null
  if (resp) {
    response = makeResponse(resp)
    return
  }

  response = null
}

function getClient() {
  return mockFetch
}

function initClientVariables() {
  response = null
  error = null
  parameters = ['']
}

describe('test plugin correctly provide client', () => {
  beforeEach(() => {
    vi.mock('#imports', () => (
      {
        createError: (payload: string | { message: string; statusCode?: number }) => {
          if (typeof payload === 'string')
            return new Error(payload)

          return new Error(payload.message)
        },
        useRuntimeConfig: () => ({
          public: {
            laravelPrecognition: {
              validationTimeout: 1000,
              fingerprintBaseUrl: '',
            },
          },
        }),
        defineNuxtPlugin: (cb: () => unknown) => {
          const { provide } = cb() as { provide: { precognition: { client: Client } } }
          return provide
        },
        useNuxtApp: () => ({
          precognition: plugin,
        }),
      }
    ))
  })

  test('main plugin is a client of type fetch and can use any client', async () => {
    setClientData({ status: 200, data: { message: 'Custom client' } })

    const { client } = myPlugin.precognition

    expect(() => client.client().name).toThrowError()

    myPlugin.precognition.client.use(getClient())
    expect(client.client().name).toBe('mockFetch')

    const resp = await client.get('url', {}, { precognitive: false })

    expect(resp?._data).toEqual({ message: 'Custom client' })
    expect(parameters[0]).toBe('url')
    expect(parameters[1]?.method).toBe('get')
    expect(parameters[1]?.precognitive).toBe(false)
  })

  test('client fires all events provided on success', async () => {
    myPlugin.precognition.client.use(getClient())
    setClientData({
      status: 204,
      headers: new Headers({
        'Precognition': 'true',
        'Precognition-Success': 'true',
      }),
    })
    const newPost = { title: 'Post title', content: 'post content' }

    let onBeforeCheck = false
    function onBefore() {
      onBeforeCheck = true
      return true
    }
    let onStartCheck = false
    function onStart() {
      onStartCheck = true
    }
    let onPrecognitionSuccessCheck = false
    function onPrecognitionSuccess(value: FetchResponse<unknown>) {
      onPrecognitionSuccessCheck = true
      return Promise.resolve(value)
    }
    let onSuccessCheck = false
    function onSuccess(value: FetchResponse<unknown>) {
      onSuccessCheck = true
      return Promise.resolve(value)
    }
    let onFinishCheck = false
    function onFinish() {
      onFinishCheck = true
    }

    const config: Config = {
      precognitive: true,
      validate: ['title', 'content'],
      onBefore,
      onStart,
      onPrecognitionSuccess,
      onSuccess,
      onFinish,
    }

    const { client } = myPlugin.precognition
    await client.post('posts', newPost, config)
    expect(onBeforeCheck).toBe(true)
    expect(onStartCheck).toBe(true)
    expect(onPrecognitionSuccessCheck).toBe(true)
    expect(onSuccessCheck).toBe(true)
    expect(onFinishCheck).toBe(true)
  })

  test('client fires all events provided on error', async () => {
    myPlugin.precognition.client.use(getClient())
    const newPost = { title: '', content: 'post content' }
    setClientData(undefined, {
      status: 422,
      message: 'Title is required',
      data: {
        errors: {
          title: ['Title is required'],
        },
      },
      headers: new Headers({ Precognition: 'true' }),
    })
    let onValidationErrorCheck = false
    const config: Config = {
      precognitive: true,
      validate: ['title'],
      onValidationError: (resp) => {
        if (resp._data && typeof resp._data === 'object' && 'errors' in resp._data) {
          expect(resp._data.errors).toEqual({ title: ['Title is required'] })
          onValidationErrorCheck = true
          return resp
        }
        throw new Error('Errors don\'t Match')
      },
    }
    const { client } = myPlugin.precognition
    await client.post('posts', newPost, config)
    expect(onValidationErrorCheck).toBe(true)
  })

  test('thrown error if status handler is not provided', async () => {
    myPlugin.precognition.client.use(getClient())
    const newPost = { title: '', content: 'post content' }
    setClientData(undefined, {
      status: 500,
      message: 'Server error',
      data: {
        message: 'Server error',
      },
      headers: new Headers({ Precognition: 'true' }),
    })
    const config: Config = {
      precognitive: true,
      validate: ['title'],
    }
    const { client } = myPlugin.precognition
    try {
      await client.post('posts', newPost, config)

      expect(true).toBe(false)
    }
    catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toMatch(/Server error/)
    }
  })
})

describe('test core functions', () => {
  beforeEach(() => {
    vi.mock('#imports', () => (
      {
        createError: (payload: string | { message: string; statusCode?: number }) => {
          if (typeof payload === 'string')
            return new Error(payload)

          return new Error(payload.message)
        },
        useRuntimeConfig: () => ({
          public: {
            laravelPrecognition: {
              validationTimeout: 1000,
              fingerprintBaseUrl: '',
            },
          },
        }),
        defineNuxtPlugin: (cb: () => unknown) => {
          const { provide } = cb() as { provide: { precognition: { client: Client } } }
          return provide
        },
        useNuxtApp: () => ({
          precognition: plugin,
        }),
      }
    ))
  })

  test.each([
    'Precognition',
    'precognition',
  ])('validatePrecognitionResponse pass with precognition headers or throw errors', (name) => {
    expect(() => validatePrecognitionResponse(new Response() as FetchResponse<unknown>)).toThrowError(/Precognition response/)

    const resp = new Response(undefined, { headers: new Headers({ [name]: 'true' }) }) as FetchResponse<unknown>

    validatePrecognitionResponse(resp)
  })

  test('resolveStatusHandler return function if status code is matching provided handler', () => {
    let message = ''
    const config: Config = {
      onUnauthorized: (resp) => {
        message = 'onUnauthorized'
        return resp
      },
    }

    let handler = resolveStatusHandler(config, 500)

    if (handler)
      handler(new Response() as FetchResponse<unknown>)

    expect(message).toBe('')

    handler = resolveStatusHandler(config, 401)

    if (handler)
      handler(new Response() as FetchResponse<unknown>)

    expect(message).toBe('onUnauthorized')
  })

  test('assertIsServerGeneratedError detects fetchError', () => {
    const fetchError1 = new FetchError('fetch error')
    fetchError1.response = new Response(undefined, { status: 422 })

    assertIsServerGeneratedError(fetchError1)

    const fetchError2 = new FetchError('no status')
    fetchError1.response = new Response(undefined)

    expect(() => assertIsServerGeneratedError(fetchError2)).toThrow(/no status/)

    const error = new Error('base error')

    expect(() => assertIsServerGeneratedError(error)).toThrow(/base error/)

    expect(() => assertIsServerGeneratedError(null)).toThrow(/expected server error/i)
  })

  test.each<Config>([
    {
      precognitive: true,
      validate: ['name', 'age'],
      headers: new Headers(),
    },
    {
      validate: ['name', 'friends.0'],
      headers: new Headers(),
    },
  ])('resolveConfig add precognitive headers', (config) => {
    const resolvedConfig = resolveConfig(config)

    const headers = resolvedConfig.headers as Headers

    expect(headers.get('Precognition')).toBe('true')
    expect(headers.get('Precognition-Validate-Only'))
      .toBe(Array.from(config.validate ?? []).join(','))
  })

  test.each<{ data: Record<string, unknown>; result: boolean }>([
    { data: { name: 'Name', avatar: new Blob() }, result: true },
    { data: { name: 'Name', avatar: null }, result: false },
    {
      data: { name: 'Name', avatar: { name: 'avatar', file: new Blob() } },
      result: true,
    },
    {
      data: { name: 'Name', images: [new Blob(), null] },
      result: true,
    },
  ])('hasFile can detect files in data, also nested files', ({ data, result }) => {
    expect(hasFiles(data)).toBe(result)
  })

  test.each<{ config: Config; method: 'get' | 'delete' }>([
    { config: { body: { name: 'Body' }, method: 'PUT' }, method: 'get' },
    { config: { body: { name: 'Body' }, method: 'GET' }, method: 'get' },
    { config: { body: { name: 'Body' }, method: 'GET' }, method: 'delete' },
  ]) ('mergeConfig put data in query for method get and delete', ({ config, method }) => {
    const data = { name: 'name' }

    const mergedConfig = mergeConfig(method, data, config)

    expect(mergedConfig.method).toEqual(config.method ?? method)
    expect(mergedConfig.query).toEqual(data)
  })

  test('mergeConfig handle URLSearchParams', () => {
    const data = { name: 'name' }

    const config: Config = {
      bodyAs: value => new URLSearchParams(value as Record<string, string>),
      method: 'GET',
    }
    const mergedConfig = mergeConfig('post', data, config)

    expect(mergedConfig.method).toBe('GET')
    expect(mergedConfig.query).toBeUndefined()
    expect(mergedConfig.body).toBeInstanceOf(URLSearchParams)
  })

  test.each<{ config: Config; method: 'post' | 'put' | 'patch' }>([
    { config: { method: 'PUT' }, method: 'post' },
    { config: {}, method: 'post' },
    { config: {}, method: 'put' },
  ]) ('mergeConfig assign data to body for post, put and patch', ({ config, method }) => {
    const data = { name: 'name' }

    const mergedConfig = mergeConfig(method, data, config)

    expect(mergedConfig.method).toEqual(config.method ?? method)
    expect(mergedConfig.body).toEqual(config.body ?? data)
  })

  test('resolveString always return the main string', () => {
    const message = 'message'
    const dynamicMessage = () => message

    expect(resolveString(message)).toBe(message)
    expect(resolveString(dynamicMessage)).toBe(message)
  })

  test('resolveInitialData always return initial data', () => {
    const data = { name: 'Name' }
    const dynamicData = () => data

    expect(resolveInitialData(data)).toEqual(data)
    expect(resolveInitialData(dynamicData)).toEqual(data)
  })

  test.each<{ headers: HeadersInit; name: string; value: string }>([
    { headers: { name: 'value' }, name: 'name', value: 'value' },
    { headers: { name: 'value', key: 'Value2' }, name: 'key', value: 'Value2' },
  ])('getHeader returns the header if present, insesitive to case name', ({ headers, name, value }) => {
    expect(getHeaders(headers, name)).toBe(value)
  })

  test.each<{
    initial: HeadersInit
    key: string
    value: string
    expectedKey: string
  }>([
    {
      initial: new Headers({ precognition: 'false' }),
      key: 'Precognition',
      value: 'true',
      expectedKey: 'precognition',
    },
    {
      initial: [['precognition', 'false']],
      key: 'Precognition',
      value: 'true',
      expectedKey: 'precognition',
    },
    {
      initial: [],
      key: 'Precognition',
      value: 'true',
      expectedKey: 'Precognition',
    },
    {
      initial: { precognition: 'false' },
      key: 'Precognition',
      value: 'true',
      expectedKey: 'precognition',
    },
  ])('setHeader can update headers, without changing type or name of the key', (
    { initial, key, value, expectedKey },
  ) => {
    setHeaders(initial, key, value)

    expect(getHeaders(initial, expectedKey)).toBe(value)
    expect(getHeaders(initial, key)).toBe(value)
  })

  test.each([200, 201, 202, 203, 204, 300])('isSuccess detect status code is success', (code) => {
    expect(isSuccess(code)).toBe(true)
  })

  test.each([400, 419, 401, 403, 500])('isSuccess detect other status code', (code) => {
    expect(isSuccess(code)).toBe(false)
  })
})

describe('test validator', () => {
  beforeEach(() => {
    vi.mock('#imports', () => (
      {
        createError: (payload: string | { message: string; statusCode?: number }) => {
          if (typeof payload === 'string')
            return new Error(payload)

          return new Error(payload.message)
        },
        useRuntimeConfig: () => ({
          public: {
            laravelPrecognition: {
              validationTimeout: 1000,
              fingerprintBaseUrl: '',
            },
          },
        }),
        defineNuxtPlugin: (cb: () => unknown) => {
          const { provide } = cb() as { provide: { precognition: { client: Client } } }
          return provide
        },
        useNuxtApp: () => ({
          precognition: plugin,
        }),
      }
    ))
    vi.useFakeTimers()
  })

  afterEach(() => {
    initClientVariables()
    vi.useRealTimers()
  })

  test.each<{ errors: SimpleValidationErrors | ValidationErrors }>([
    { errors: { name: 'Name is required' } },
    { errors: { name: ['Name is required'] } },
    { errors: { name: ['Name is required', 'Second Error'] } },
  ])('toSimpleValidationErrors converts errors in simple message', ({ errors }) => {
    const simple = toSimpleValidationErrors(errors)

    expect(simple.name).toBe('Name is required')
  })

  test.each<{ errors: SimpleValidationErrors | ValidationErrors }>([
    { errors: { name: 'Name is required' } },
    { errors: { name: ['Name is required'] } },
  ])('toValidationErrors converts errors in a single array string', ({ errors }) => {
    const validationErrors = toValidationErrors(errors)

    expect(validationErrors.name).toEqual(['Name is required'])
  })

  test.each<{ name: string | NamedInputEvent; resolved: string }>([
    { name: 'name', resolved: 'name' },
    { name: { target: { name: 'name of target' } } as NamedInputEvent, resolved: 'name of target' },
  ])('resolveName', ({ name, resolved }) => {
    expect(resolveName(name)).toBe(resolved)
  })
})
