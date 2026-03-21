import type { Request, Response } from 'express'
import validate from '#validator'
import schema from './schema.ts'
import Like from './model.ts'

export default {

  async create(request: Request, response: Response) {
    let result = await validate(schema, request.params)
    if (result.isErr()) return response.status(400).json({ error: 'Invalid post ID' })
    try {
      await Like.create(result.value.postId, request.user!.id)
      return response.status(201).json({ ok: true })
    } 
    catch {
      return response.status(409).json({ error: 'Already liked' })
    }
  },

  async remove(request: Request, response: Response) {
    let result = await validate(schema, request.params)
    if (result.isErr()) return response.status(400).json({ error: 'Invalid post ID' })
    try {
      await Like.remove(result.value.postId, request.user!.id)
      return response.status(200).json({ ok: true })
    } 
    catch {
      return response.status(404).json({ error: 'Like not found' })
    }
  }
}
