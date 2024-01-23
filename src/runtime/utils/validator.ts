import { debounce, get, isEqual, merge, omit, set } from 'lodash-es'
import { FetchError } from 'ofetch'
import type { Config, NamedInputEvent, SimpleValidationErrors, Validator as TValidator, ValidationCallback, ValidationConfig, ValidationErrors, ValidatorListeners } from '../types/core'
import { isFile } from '../utils/core'
import { useNuxtApp } from '#imports'

export function createValidator(callback: ValidationCallback, initialData: Record<string, unknown> = {}): TValidator {
  const { $precognition } = useNuxtApp()

  /**
   * Event listener state.
   */
  const listeners: ValidatorListeners = {
    errorsChanged: [],
    touchedChanged: [],
    validatingChanged: [],
    validatedChanged: [],
  }

  /**
   * Validate files state.
   */
  let validateFiles = false

  /**
   * Processing validation state.
   */
  let validating = false

  /**
   * Validation errors state.
   */
  let errors: ValidationErrors = {}

  /**
     * Inputs that have been validated.
     */
  let validated: Array<string> = []

  /**
       * Debouncing timeout state.
       */
  let debounceTimeoutDuration = 1500

  /**
   * Validator state.
   */
  let validator = createValidator()

  /**
     * Set the validating inputs.
     *
     * Returns an array of listeners that should be invoked once all state
     * changes have taken place.
     */
  const setValidating = (value: boolean): (() => void)[] => {
    if (value !== validating) {
      validating = value

      return listeners.validatingChanged
    }

    return []
  }

  const setValidated = (value: Array<string>): (() => void)[] => {
    const uniqueNames = [...new Set(value)]

    if (validated.length !== uniqueNames.length || !uniqueNames.every(name => validated.includes(name))) {
      validated = uniqueNames

      return listeners.validatedChanged
    }

    return []
  }

  /**
   * Valid validation state.
   */
  const valid = () => validated.filter(name => typeof errors[name] === 'undefined')

  /**
   * Touched input state.
   */
  let touched: Array<string> = []

  const setTouched = (value: Array<string>): (() => void)[] => {
    const uniqueNames = [...new Set(value)]

    if (touched.length !== uniqueNames.length || !uniqueNames.every(name => touched.includes(name))) {
      touched = uniqueNames

      return listeners.touchedChanged
    }

    return []
  }

  const setErrors = (value: ValidationErrors | SimpleValidationErrors): (() => void)[] => {
    const prepared = toValidationErrors(value)

    if (!isEqual(errors, prepared)) {
      errors = prepared

      return listeners.errorsChanged
    }

    return []
  }

  const forgetError = (name: string | NamedInputEvent): (() => void)[] => {
    const newErrors = { ...errors }

    delete newErrors[resolveName(name)]

    return setErrors(newErrors)
  }

  /**
   * Has errors state.
   */
  const hasErrors = () => Object.keys(errors).length > 0

  /**
   * The old data.
   */
  let oldData = initialData

  /**
   * The data currently being validated.
   */
  let validatingData: null | Record<string, unknown> = null

  /**
   * The old touched.
   */
  let oldTouched: string[] = []

  /**
   * The touched currently being validated.
   */
  let validatingTouched: null | string[] = null

  /**
   * Parse the validated data.
   */
  const parseData = <Data extends Record<string, unknown>>(data: Data): Partial<Data> => validateFiles === false
    ? forgetFiles(data)
    : data

  /**
     * Create a debounced validation callback.
     */
  function createValidator() {
    return debounce(() => {
      callback({
        get: (url, data = {}, config = {}) => $precognition.client.get(url, parseData(data), resolveConfig(config, data)),
        post: (url, data = {}, config = {}) => $precognition.client.post(url, parseData(data), resolveConfig(config, data)),
        patch: (url, data = {}, config = {}) => $precognition.client.patch(url, parseData(data), resolveConfig(config, data)),
        put: (url, data = {}, config = {}) => $precognition.client.put(url, parseData(data), resolveConfig(config, data)),
        delete: (url, data = {}, config = {}) => $precognition.client.delete(url, parseData(data), resolveConfig(config, data)),
      }).catch(error => (error instanceof FetchError) ? null : Promise.reject(error))
    }, debounceTimeoutDuration, { leading: true, trailing: true })
  }

  const setDebounceTimeout = (value: number) => {
    debounceTimeoutDuration = value

    validator.cancel()

    validator = createValidator()
  }

  /**
   * Resolve the configuration.
   */
  function resolveConfig(config: ValidationConfig, data: Record<string, unknown> = {}): Config {
    const validate = Array.from(config.validate ?? touched)

    return {
      ...config,
      validate,
      timeout: config.timeout ?? 5000,
      onValidationError: (response, fetchError) => {
        [...setValidated([...validated, ...validate]),
        ].forEach(listener => listener())

        if (
          typeof response._data === 'object'
          && response.status === 422
          && response._data
          && 'errors' in response._data
        ) {
          [...setErrors(merge(omit({ ...errors }, validate), response._data.errors)),
          ].forEach(listener => listener())
        }

        if (config.onValidationError)
          return config.onValidationError(response, fetchError)

        throw fetchError ?? new Error('Unknown error')
      },
      onSuccess: (response) => {
        setValidated([...validated, ...validate]).forEach(listener => listener())

        return Promise.resolve(response)
      },
      onPrecognitionSuccess: (response) => {
        [...setValidated([...validated, ...validate]),
          ...setErrors(omit({ ...errors }, validate)),
        ].forEach(listener => listener())

        if (config.onPrecognitionSuccess)
          return config.onPrecognitionSuccess(response)

        return Promise.resolve(response)
      },
      onBefore: () => {
        const beforeValidationResult = (config.onBeforeValidation ?? ((previous, next) => {
          return !isEqual(previous, next)
        }))({ data, touched }, { data: oldData, touched: oldTouched })

        if (beforeValidationResult === false)
          return false

        const beforeResult = (config.onBefore || (() => true))()

        if (beforeResult === false)
          return false

        validatingTouched = touched

        validatingData = data

        return true
      },
      onStart: () => {
        setValidating(true).forEach(listener => listener());

        (config.onStart ?? (() => null))()
      },
      onFinish: () => {
        setValidating(false).forEach(listener => listener())

        oldTouched = validatingTouched!

        oldData = validatingData!

        validatingTouched = validatingData = null;

        (config.onFinish ?? (() => null))()
      },
    }
  }

  /**
   * Validate the given input.
   */
  const validate = (name?: string | NamedInputEvent, value?: unknown) => {
    if (typeof name === 'undefined') {
      validator()

      return
    }

    if (isFile(value) && !validateFiles) {
      console.warn('Precognition file validation is not active. Call the "validateFiles" function on your form to enable it.')

      return
    }

    name = resolveName(name)

    if (get(oldData, name) !== value)
      setTouched([name, ...touched]).forEach(listener => listener())

    if (touched.length === 0)
      return

    validator()
  }

  /**
   * The form validator instance.
   */
  const form: TValidator = {
    touched: () => touched,
    validate(input, value) {
      validate(input, value)

      return form
    },
    touch(input) {
      const inputs = Array.isArray(input)
        ? input
        : [resolveName(input)]

      setTouched([...touched, ...inputs]).forEach(listener => listener())

      return form
    },
    validating: () => validating,
    valid,
    errors: () => errors,
    hasErrors,
    setErrors(value) {
      setErrors(value).forEach(listener => listener())

      return form
    },
    forgetError(name) {
      forgetError(name).forEach(listener => listener())

      return form
    },
    reset(...names) {
      if (names.length === 0) {
        setTouched([]).forEach(listener => listener())
        setErrors({}).forEach(listener => listener())
        setValidated([]).forEach(listener => listener())
      }
      else {
        const newTouched = [...touched]

        names.forEach((name) => {
          if (newTouched.includes(name))
            newTouched.splice(newTouched.indexOf(name), 1)

          set(oldData, name, get(initialData, name))
        })

        setTouched(newTouched).forEach(listener => listener())
      }

      return form
    },
    setTimeout(value) {
      setDebounceTimeout(value)

      return form
    },
    on(event, callback) {
      listeners[event].push(callback)

      return form
    },
    validateFiles() {
      validateFiles = true

      return form
    },
  }

  return form
}

/**
 * Normalise the validation errors as Inertia formatted errors.
 */
export function toSimpleValidationErrors(errors: ValidationErrors | SimpleValidationErrors): SimpleValidationErrors {
  return Object.keys(errors).reduce((carry, key) => ({
    ...carry,
    [key]: Array.isArray(errors[key])
      ? errors[key][0]
      : errors[key],
  }), {})
}

/**
 * Normalise the validation errors as Laravel formatted errors.
 */
export function toValidationErrors(errors: ValidationErrors | SimpleValidationErrors): ValidationErrors {
  return Object.keys(errors).reduce((carry, key) => ({
    ...carry,
    [key]: typeof errors[key] === 'string' ? [errors[key]] : errors[key],
  }), {})
}

/**
 * Resolve the input's "name" attribute.
 */
export function resolveName(name: string | NamedInputEvent): string {
  return typeof name !== 'string'
    ? name.target.name
    : name
}

/**
 * Forget any files from the payload.
 */
function forgetFiles<Data extends Record<string, unknown>>(data: Data): Partial<Data> {
  const newData = { ...data }

  Object.keys(newData).forEach((k) => {
    const name = k as keyof Data
    const value = newData[name]

    if (value === null)
      return

    if (isFile(value)) {
      delete newData[name]

      return
    }

    if (Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      newData[name] = value.filter(value => !isFile(value)) as any

      return
    }

    if (typeof value === 'object') {
      // @ts-expect-error to be evaluated
      newData[name] = forgetFiles(newData[name])
    }
  })

  return newData
}
