import vine from '@vinejs/vine'

// lowercase letters, numbers and hyphens
// no spaces, no uppercase, no special characters
let validUsernameRegex = /^[a-z0-9-]+$/

let getPasswordRules = ()=> vine.string().minLength(12).maxLength(128).clone()

export default {
  registration: vine.object({
    username: vine.string().minLength(1).maxLength(32).regex(validUsernameRegex), 
    email: vine.string().email(),
    password: getPasswordRules(),
    code: vine.string()
  }),
  login: vine.object({
    email: vine.string().email(),
    password: vine.string() // don't enforce in case the password rules change
  }),
  passwordChange: vine.object({
    currentPassword: vine.string(), // don't enforce in case the password rules change
    newPassword: getPasswordRules()
  }),
  createPasswordResetCode: vine.object({
    id: vine.string().uuid()
  }),
  resetPassword: vine.object({
    code: vine.string(),
    newPassword:getPasswordRules()
  })
}
