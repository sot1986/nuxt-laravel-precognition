import type { FetchError, FetchResponse } from 'ofetch'

export type StatusHandler = (response: FetchResponse<unknown>, error?: FetchError) => FetchResponse<unknown>

export type ValidationErrors = Record<string, Array<string>>

export type SimpleValidationErrors = Record<string, string>

export type Config = NonNullable<Parameters<typeof $fetch>[1]> & {
  precognitive?: boolean
  validate?: Iterable<string> | ArrayLike<string>
  fingerprint?: string | null
  queryAs?: (data: Record<string, unknown>) => NonNullable<Parameters<typeof $fetch>[1]>['query']
  bodyAs?: (data: Record<string, unknown>) => NonNullable<Parameters<typeof $fetch>[1]>['body']
  onBefore?: () => boolean | undefined
  onStart?: () => void
  onSuccess?: (response: FetchResponse<unknown>) => Promise<FetchResponse<unknown>>
  onPrecognitionSuccess?: (response: FetchResponse<unknown>) => Promise<FetchResponse<unknown>>
  onValidationError?: StatusHandler
  onUnauthorized?: StatusHandler
  onForbidden?: StatusHandler
  onNotFound?: StatusHandler
  onConflict?: StatusHandler
  onLocked?: StatusHandler
  onFinish?: () => void
}

interface RevalidatePayload {
  data: Record<string, unknown> | null
  touched: Array<string>
}

export type ValidationConfig = Config & {
  onBeforeValidation?: (newRequest: RevalidatePayload, oldRequest: RevalidatePayload) => boolean | undefined
}

export type SuccessResolver = (response: FetchResponse<unknown>) => boolean

export interface Client {
  get(url: string, data?: Record<string, unknown>, config?: Config): Promise< FetchResponse<unknown> | null>
  post(url: string, data?: Record<string, unknown>, config?: Config): Promise<FetchResponse<unknown> | null>
  patch(url: string, data?: Record<string, unknown>, config?: Config): Promise<FetchResponse<unknown> | null>
  put(url: string, data?: Record<string, unknown>, config?: Config): Promise<FetchResponse<unknown> | null>
  delete(url: string, data?: Record<string, unknown>, config?: Config): Promise<FetchResponse<unknown> | null>
  use(client: typeof $fetch): Client
  determineSuccessUsing(callback: SuccessResolver): Client
  client(): typeof $fetch
}

export interface Validator {
  touched(): Array<string>
  validate(input?: string | NamedInputEvent, value?: unknown): Validator
  touch(input: string | NamedInputEvent | Array<string>): Validator
  validating(): boolean
  valid(): Array<string>
  errors(): ValidationErrors
  setErrors(errors: ValidationErrors | SimpleValidationErrors): Validator
  hasErrors(): boolean
  forgetError(error: string | NamedInputEvent): Validator
  reset(...names: string[]): Validator
  setTimeout(duration: number): Validator
  on(event: keyof ValidatorListeners, callback: () => void): Validator
  validateFiles(): Validator
}

export interface ValidatorListeners {
  errorsChanged: Array<() => void>
  validatingChanged: Array<() => void>
  touchedChanged: Array<() => void>
  validatedChanged: Array<() => void>
}

export type RequestMethod = 'get' | 'post' | 'patch' | 'put' | 'delete'

export type ValidationCallback = (client: {
  get(url: string, data?: Record<string, unknown>, config?: ValidationConfig): Promise<FetchResponse<unknown> | null>
  post(url: string, data?: Record<string, unknown>, config?: ValidationConfig): Promise<FetchResponse<unknown> | null>
  patch(url: string, data?: Record<string, unknown>, config?: ValidationConfig): Promise<FetchResponse<unknown> | null>
  put(url: string, data?: Record<string, unknown>, config?: ValidationConfig): Promise<FetchResponse<unknown> | null>
  delete(url: string, data?: Record<string, unknown>, config?: ValidationConfig): Promise<FetchResponse<unknown> | null>
}) => Promise<FetchResponse<unknown> | null>

interface NamedEventTarget extends EventTarget {
  name: string
}

export interface NamedInputEvent extends InputEvent {
  readonly target: NamedEventTarget
}

type ArrayKeys<T extends unknown[]> =
T extends [unknown, ...unknown[]]
  ? T extends Record<infer Index, unknown>
    ? Index extends `${number}`
      ? Index
      : never
    : never
  : `${number}`

type ObjectKeys<T extends object> =
T extends unknown[]
  ? ArrayKeys<T>
  : keyof T & string

interface HasConstructor {
  new (...args: any[]): any
}

export type NestedKeyOf<T> = T extends Record<infer Key, unknown>
  ? T extends HasConstructor
    ? never
    : T extends CallableFunction
      ? never
      : Key extends string | number
        ? ObjectKeys<T> | (T[Key] extends object
          ? `${ObjectKeys<Pick<T, Key>>}.${NestedKeyOf<T[Key]>}`
          : T extends unknown[]
            ? T extends [unknown, ...unknown[]]
              ? never
              : T[number] extends object
                ? `${number}.${NestedKeyOf<T[number]>}`
                : never
            : never
        )
        : never
  : never

type _Test = NestedKeyOf<Record<string, unknown>>

type SplitArrayKeys<T extends string> =
T extends `${infer Key}.${infer NestedKey}`
  ? [`${Key}`, ...SplitArrayKeys<NestedKey>]
  : [`${T}`]

export type NestedKeyPathsOf<T extends object> = SplitArrayKeys<NestedKeyOf<T>>

type CanBeFile<TData> = TData extends File
  ? TData
  : TData extends Blob
    ? TData
    : TData extends FileList
      ? TData
      : never

type _TestCanBeFile = CanBeFile<string | null>
