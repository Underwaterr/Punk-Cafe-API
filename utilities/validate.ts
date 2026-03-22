import vine, { errors } from '@vinejs/vine'

// hack because SchemaTypes is not available
type Schema = Parameters<typeof vine.validate>[0]['schema']

export default async function validate<T extends Schema>(schema: T, data: unknown) {
  try {
    let result = await vine.validate({ schema, data })
    return { ok: true as const, value: result }
  }
  catch (error) {
    let isValidationError = error instanceof errors.E_VALIDATION_ERROR
    if (isValidationError) return { ok: false as const }
    else throw error
  }
}
