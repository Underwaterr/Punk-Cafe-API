import vine from '@vinejs/vine'

export default {
  create: vine.object({
    realName: vine.string()
  }),
}
