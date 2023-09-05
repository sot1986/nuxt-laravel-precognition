import { cloneDeep, get, set } from 'lodash-es'
import type { Ref } from 'vue'
import type { Form } from '../types/useForm'
import type { Config, NestedKeyOf, RequestMethod, ValidationConfig, ValidationErrors } from '../types/core'
import { createValidator, resolveName, toSimpleValidationErrors } from '../utils/validator'
import { resolveInitialData, resolveString } from '../utils/core'
import { reactive, ref, toRaw, useNuxtApp } from '#imports'

export function useForm<Data extends Record<string, unknown>>(
  method: RequestMethod | (() => RequestMethod),
  url: string | (() => string),
  inputs: Data | (() => Data),
  config: ValidationConfig = {},
): Data & Form<Data> {
  const { $precognition } = useNuxtApp()

  /**
     * The original data.
     */
  const originalData = cloneDeep(toRaw(resolveInitialData(inputs)))

  /**
     * The original input names.
     */
  const originalInputs: (keyof Data & string)[] = Object.keys(originalData)

  /**
     * Reactive valid state.
     */
  const valid = ref([]) as Ref<(NestedKeyOf<Data> & string)[]>

  /**
     * Reactive touched state.
     */
  const touched = ref([]) as Ref<(NestedKeyOf<Partial<Data>> & string)[]>

  let form: Data & Form<Data>

  /**
     * The validator instance.
     */
  const validator = createValidator(client => client[resolveString(method)](
    resolveString(url),
    form.data(),
    config,
  ), resolveInitialData(originalData))
    .on('validatingChanged', () => {
      form.validating = validator.validating()
    })
    .on('validatedChanged', () => {
      valid.value = validator.valid() as typeof valid.value
    })
    .on('touchedChanged', () => {
      touched.value = validator.touched() as typeof touched.value
    })
    .on('errorsChanged', () => {
      form.hasErrors = validator.hasErrors()

      // @ts-expect-error test description
      form.errors = toSimpleValidationErrors(validator.errors())
    })

  /**
     * Resolve the config for a form submission.
     */
  const resolveSubmitConfig = (config: Config): Config => ({
    ...config,
    precognitive: false,
    onStart: () => {
      form.processing = true;

      (config.onStart ?? (() => null))()
    },
    onFinish: () => {
      form.processing = false;

      (config.onFinish ?? (() => null))()
    },
    onValidationError: (response, error) => {
      if (response._data && typeof response._data === 'object' && 'errors' in response._data)
        validator.setErrors(response._data.errors as ValidationErrors)

      if (config.onValidationError)
        return config.onValidationError(response)

      throw error ?? new Error('Unknown error.')
    },
  })

  /**
   * Create a new form instance.
   */
  form = {
    ...cloneDeep(toRaw(resolveInitialData(inputs))),
    data() {
      const data = cloneDeep(toRaw(form))

      return originalInputs.reduce((carry, name) => ({
        ...carry,
        [name]: data[name],
      }), {}) as Data
    },
    setData(data: Record<string, unknown>) {
      Object.keys(data).forEach((input) => {
        if (input in originalData)
          // @ts-expect-error data is typeof of Data
          form[input] = data[input]
      })

      return form
    },
    touched(name) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return touched.value.includes(name as any)
    },
    touch(name) {
      validator.touch(name)

      return form
    },
    validate(name) {
      if (typeof name === 'undefined') {
        validator.validate()
      }
      else {
        const mainKey = typeof name === 'object'
          ? name.target.name.split('.').at(0)
          : name.split('.').at(0)

        if (originalInputs.includes(resolveName(mainKey ?? '')))
          validator.validate(name, get(form.data(), name as keyof Data & string))
      }

      return form
    },
    validating: false,
    valid(name) {
      return valid.value.includes(name)
    },
    invalid(name) {
      return typeof form.errors[name] !== 'undefined'
    },
    errors: {},
    hasErrors: false,
    setErrors(errors) {
      validator.setErrors(errors as ValidationErrors)

      return form
    },
    forgetError(name) {
      validator.forgetError(name)

      return form
    },
    reset(...names) {
      const original = cloneDeep(resolveInitialData(inputs))

      if (names.length === 0)
        originalInputs.forEach(name => (form[name] = original[name]))
      else
        names.forEach(name => set(form, name, get(original, name)))

      validator.reset(...names)

      return form
    },
    setValidationTimeout(duration) {
      validator.setTimeout(duration)

      return form
    },
    processing: false,
    async submit(config = {}) {
      const resp = await $precognition.client[resolveString(method)](
        resolveString(url),
        form.data(),
        resolveSubmitConfig(config),
      )
      return resp
    },
    validateFiles() {
      validator.validateFiles()

      return form
    },
    validator() {
      return validator
    },
  }

  form = reactive(form) as Data & Form<Data>

  return form
}
