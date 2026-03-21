import vine from '@vinejs/vine'

// lowercase letters, numbers and hyphens
// no spaces, no uppercase, no special characters
let validUsernameRegex = /^[a-z0-9-]+$/

export default {
  registration: vine.object({
    username: vine.string().minLength(1).maxLength(32).regex(validUsernameRegex), 
    email: vine.string().email(),
    password: vine.string().minLength(12).maxLength(128),
    code: vine.string()
  }),
  login: vine.object({
    email: vine.string().email(),
    password: vine.string()
  }),
  passwordChange: vine.object({
    currentPassword: vine.string(),
    newPassword: vine.string().minLength(12).maxLength(128),
  })
}
