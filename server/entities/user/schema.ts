import vine from '@vinejs/vine'

export default vine.object({
  id: vine.string().uuid()
})
