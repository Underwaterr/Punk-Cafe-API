import vine from '@vinejs/vine'

export default {
  params: vine.object({
    id: vine.string().uuid()
  }),
  captionUpdate: vine.object({
    caption: vine.string().maxLength(500).nullable()
  })
}
