import { FetchError } from 'ofetch'
import type { FetchResponse } from 'ofetch'
import type { Config, RequestMethod, StatusHandler } from '../types/core'
import { createError } from '#imports'

/**
 * Ensure that the response is a Precognition response.
 */
export function validatePrecognitionResponse(response: FetchResponse<unknown>) {
  if (response.headers.get('precognition') === 'true')
    return

  throw createError({
    message: 'Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.',
    statusCode: 400,
  })
}

/**
 * Resolve the handler for the given HTTP response status.
 */
export function resolveStatusHandler(config: Config, code: number): StatusHandler | undefined {
  return {
    401: config.onUnauthorized,
    403: config.onForbidden,
    404: config.onNotFound,
    409: config.onConflict,
    422: config.onValidationError,
    423: config.onLocked,
  }[code]
}

/**
 * Determine if the status is successful.
 */
export function isSuccess(status: number): boolean {
  return status >= 200 && status <= 300
}

/**
 * Determine if the error was not triggered by a server response.
 */
export function assertIsServerGeneratedError(error: unknown): asserts error is
FetchError & { response: FetchResponse<unknown> } {
  if (
    error instanceof FetchError
    && 'response' in error
    && typeof error.response?.status === 'number'
  )
    return

  if (error instanceof Error)
    throw error

  throw createError('Expected server error.')
}

/**
 * Returns the headers value if present, case insensitive
 * @param headers
 * @param name
 */
export function getHeaders(headers: HeadersInit, name: string): string | null {
  if (headers instanceof (Headers))
    return headers.get(name)

  const newHeaders = new Headers(headers)
  return getHeaders(newHeaders, name)
}

/**
 * Update the provided headers with name and value provided, case insensitive
 * @param headers
 * @param name
 * @param value
 */
export function setHeaders(headers: HeadersInit, name: string, value: string): void {
  if (headers instanceof Headers && getHeaders(headers, name)) {
    headers.set(name, value)
    return
  }

  if (headers instanceof Headers) {
    headers.append(name, value)
    return
  }

  if (!Array.isArray(headers)) {
    const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase()) ?? name
    headers[key] = value
    return
  }

  const index = headers.findIndex(([headerName]) => headerName.toLowerCase() === name.toLowerCase())

  if (index >= 0) {
    headers[index] = [headers[index][0], value]
    return
  }

  headers.push([name, value])
}

/**
 * Resolve the configuration.
 */
export function resolveConfig(config?: Config): Config {
  const headers = config?.headers ?? {}

  if (config?.precognitive !== false)
    setHeaders(headers, 'Precognition', 'true')

  if (config?.validate)
    setHeaders(headers, 'Precognition-Validate-Only', Array.from(config.validate).join())

  return {
    ...config,
    precognitive: config?.precognitive !== false,
    headers,
  }
}

/**
 * Determine if the payload has any files.
 */
export function hasFiles(data: unknown): boolean {
  if (typeof data !== 'object')
    return false

  if (!data)
    return false

  if (isFile(data))
    return true

  if (data instanceof FormData)
    return Array.from([...data.values()]).reduce((check, entry) => check || isFile(entry), false)

  return Object.values(data).some(value => hasFiles(value))
}

/**
 * Determine if the value is a file.
 */
export function isFile(value: unknown): value is Blob | File | FileList {
  if (value instanceof Blob)
    return true

  if (import.meta.server)
    return false

  if (typeof File !== 'undefined' && value instanceof File)
    return true

  if (typeof FileList !== 'undefined' && value instanceof FileList)
    return true

  return false
}

/**
 * Merge the client specified arguments with the provided configuration.
 */
export function mergeConfig(
  method: RequestMethod,
  data?: Record<string, unknown>,
  config?: Config,
): Config {
  const baseConfig: Config = {
    method,
    ...config,
    ...(['get', 'delete'].includes(method)
      ? {
          query: 'query' in (config ?? {})
            ? config?.query
            : (config?.queryAs ?? (value => value))(data ?? {}),
        }
      : {
          body: 'body' in (config ?? {})
            ? config?.body
            : (config?.bodyAs ?? (value => value))(data ?? {}),
        }),
  }

  return baseConfig
}

export function resolveString<T extends string>(value: T | (() => T)): T {
  return typeof value === 'function'
    ? value()
    : value
}

export function resolveInitialData<T extends Record<string, unknown>>(data: T | (() => T)) {
  return typeof data === 'function'
    ? data()
    : data
}

export function assertIsFetchResponse(
  value: unknown, message = 'Expected FetchResponse',
): asserts value is FetchResponse<unknown> {
  if (isFetchResponse(value))
    return

  throw createError(message)
}

export function isFetchResponse(value: unknown): value is FetchResponse<unknown> {
  return (value instanceof Response)
}
