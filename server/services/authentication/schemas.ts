import vine from '@vinejs/vine'

let getPasswordRules = ()=> vine.string().minLength(12).maxLength(128).clone()

export default {
  registration: vine.object({
    realName: vine.string(),
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
