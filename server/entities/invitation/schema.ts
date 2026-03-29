import vine from '@vinejs/vine'

export default {
  create: vine.object({
    realName: vine.string()
  }),
  remove: vine.object({
    id: vine.string().uuid()
  })
}
