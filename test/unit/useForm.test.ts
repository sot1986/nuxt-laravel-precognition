import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { FetchResponse } from 'ofetch'
import { FetchError } from 'ofetch'
import { computed, reactive, ref, toRaw } from 'vue'

import type {
  Client,
  Config,
} from '../../src/runtime/types/core'
import plugin from '../../src/runtime/plugin'
import { useForm } from '../../src/runtime/composables/useForm'

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

describe('test useForm composable', () => {
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
          $precognition: myPlugin.precognition,
        }),
        toRaw,
        ref,
        computed,
        reactive,
      }
    ))

    initClientVariables()
  })

  test('use form has all properties for UseForm interface', () => {
    const data = { name: 'Name' }

    const form = useForm('post', 'url', data)

    expect('name' in form).toBe(true)
    expect('processing' in form).toBe(true)
    expect('validating' in form).toBe(true)
    expect('touched' in form).toBe(true)
    expect('touch' in form).toBe(true)
    expect('data' in form).toBe(true)
    expect('setData' in form).toBe(true)
    expect('errors' in form).toBe(true)
    expect('hasErrors' in form).toBe(true)
    expect('valid' in form).toBe(true)
    expect('invalid' in form).toBe(true)
    expect('validate' in form).toBe(true)
    expect('setErrors' in form).toBe(true)
    expect('forgetError' in form).toBe(true)
    expect('setValidationTimeout' in form).toBe(true)
    expect('submit' in form).toBe(true)
    expect('reset' in form).toBe(true)
    expect('validateFiles' in form).toBe(true)
    expect('validator' in form).toBe(true)

    expect(form.name).toBe('Name')
    expect(form.processing).toBe(false)
    expect(form.validating).toBe(false)
    expect(typeof form.touched).toBe('function')
    expect(typeof form.touch).toBe('function')
    expect(typeof form.data).toBe('function')
    expect(typeof form.setData).toBe('function')
    expect(form.errors).toEqual({})
    expect(form.hasErrors).toBe(false)
    expect(typeof form.valid).toBe('function')
    expect(typeof form.invalid).toBe('function')
    expect(typeof form.validate).toBe('function')
    expect(typeof form.setErrors).toBe('function')
    expect(typeof form.forgetError).toBe('function')
    expect(typeof form.setValidationTimeout).toBe('function')
    expect(typeof form.submit).toBe('function')
    expect(typeof form.reset).toBe('function')
    expect(typeof form.validateFiles).toBe('function')
    expect(typeof form.validator).toBe('function')
  })

  test('test touch and touched methods', () => {
    const data = { name: 'Name' }
    const form = useForm('post', 'url', data)

    form.touch('name')
    expect(form.touched('name')).toBe(true)
  })

  test('data and setData returns the form data and let update it', () => {
    const data = { name: 'Name' }
    const form = useForm('post', 'url', data)

    expect(form.name).toBe('Name')
    expect(form.data()).toEqual(data)
    form.setData({ name: 'new name' })
    expect(form.name).toBe('new name')
    expect(form.data()).toEqual({ name: 'new name' })
  })

  test.each([
    { data: { data: { message: 'Custom client' } }, onSuccess: () => 5 },
  ])('submit get unwrapped data from fetch response', async ({ data, onSuccess }) => {
    setClientData({ status: 201, data })

    const { client } = myPlugin.precognition
    myPlugin.precognition.client.use(getClient())
    expect(client.client().name).toBe('mockFetch')

    const form = useForm('post', 'url', { name: 'Name' })

    let resp = await form.submit()
    expect(resp).toEqual(data)

    resp = await form.submit({ onSuccess })
    expect(resp).toBe(onSuccess())

    expect(form.errors).toEqual({})
    expect(form.hasErrors).toBe(false)
  })

  test('on validation errors, the errors are sets', async () => {
    const errorsData = {
      message: 'Name is required',
      errors: {
        name: ['Name is required'],
      },
    }

    setClientData(undefined, { status: 422, message: 'Name is required', data: errorsData })
    myPlugin.precognition.client.use(getClient())

    const form = useForm('post', 'url', { name: '' })

    let errorMessage: string = ''

    await form.submit({
      onValidationError: (resp) => {
        errorMessage = (resp._data && typeof resp._data === 'object' && 'message' in resp._data)
          ? String(resp._data.message)
          : ''
      },
    })

    expect(errorMessage).toBe(errorsData.message)
    expect(form.errors.name).toEqual(errorsData.errors.name.at(0))
    expect(form.valid('name')).toBe(false)
    expect(form.invalid('name')).toBe(true)
    expect(form.hasErrors).toBe(true)

    form.reset()

    expect(form.errors).toEqual({})
    expect(form.valid('name')).toBe(false)
    expect(form.invalid('name')).toBe(false)
    expect(form.hasErrors).toBe(false)
  })
})
