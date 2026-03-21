import vine from '@vinejs/vine'

export default {
  parameter: vine.object({
    id: vine.string().uuid()
  }),
  profileUpdate: vine.object({
    displayName: vine.string().maxLength(64).optional(),
    pronouns: vine.string().maxLength(32).optional(),
    bio: vine.string().maxLength(300).optional(),
  })
}
