import vine from '@vinejs/vine'

export default vine.object({
  postId: vine.string().uuid()
}) 
