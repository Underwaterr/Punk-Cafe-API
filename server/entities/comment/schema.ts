import vine from '@vinejs/vine'

export default {
  create: vine.object({
    postId: vine.string().uuid(),
    body: vine.string().minLength(1).maxLength(500),
  }),
  update: vine.object({
    body: vine.string().minLength(1).maxLength(500),
  }),
  params: vine.object({
    id: vine.string().uuid(),
  })
}
