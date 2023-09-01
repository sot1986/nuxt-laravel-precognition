import type { Config, NamedInputEvent, NestedKeyOf, Validator } from './core'

export interface Form<Data extends Record<string, unknown>> {
  processing: boolean
  validating: boolean
  touched(name: NestedKeyOf<Data> & string): boolean
  touch(name: NestedKeyOf<Data> & string | NamedInputEvent | Array<NestedKeyOf<Data> & string>): Data & Form<Data>
  data(): Data
  setData(data: Record<string, unknown>): Data & Form<Data>
  errors: Partial<Record<NestedKeyOf<Data> & string, string>>
  hasErrors: boolean
  valid(name: NestedKeyOf<Data> & string & string): boolean
  invalid(name: NestedKeyOf<Data> & string & string): boolean
  validate(name?: NestedKeyOf<Data> & string & string | NamedInputEvent): Data & Form<Data>
  setErrors(errors: Partial<Record<NestedKeyOf<Data> & string, string | string[]>>): Data & Form<Data>
  forgetError(string: NestedKeyOf<Data> & string & string | NamedInputEvent): Data & Form<Data>
  setValidationTimeout(duration: number): Data & Form<Data>
  submit(config?: Config): Promise<unknown>
  reset(...keys: (NestedKeyOf<Partial<Data>> & string)[]): Data & Form<Data>
  validateFiles(): Form<Data>
  validator(): Validator
}
