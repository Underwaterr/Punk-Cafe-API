import type { Request, Response } from 'express'
import Post from './model.ts'
import validate from '#validator'
import schema from './schema.ts'

export default {
  async create(request:Request, response:Response) {
    if (!request.file) return response.status(400).json({ error: 'Image required' })

    let caption = request.body.caption ?? null
    let post = await Post.create(request.user!.id, caption, request.file.buffer)

    return response.status(201).json(post)
  },
  async getAll(_request: Request, response: Response) {
    let posts = await Post.getAll()
    return response.json(posts)
  },
  async getById(request: Request, response: Response) {
    let result = await validate(schema, request.params)
    if (result.isErr()) return response.status(400).json({ error: 'Invalid post ID' })

    let post = await Post.getById(result.value.id)
    if (!post) return response.status(404).json({ error: 'Post not found' })

    return response.json(post)
  },
}
