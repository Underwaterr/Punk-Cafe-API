import vine, { errors } from '@vinejs/vine'
import { ok, err } from 'neverthrow'

// hack because SchemaTypes is not available
type Schema = Parameters<typeof vine.validate>[0]['schema']

export default async function validate<T extends Schema>(schema: T, data: unknown) {
  try {
    let result = await vine.validate({ schema, data })
    return ok(result)
  }
  catch (error) {
    let isValidationError = error instanceof errors.E_VALIDATION_ERROR
    if (isValidationError) return err('validation')
    else throw error
  }
}
