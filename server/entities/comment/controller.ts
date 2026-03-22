import type { Request, Response } from 'express'
import validate from '#validate'
import schema from './schema.ts'
import Comment from './model.ts'
import Post from '../post/model.ts'

export default {
  async create(request:Request, response:Response) {
    let result = await validate(schema.create, request.body)
    if (!result.ok) return response.status(400).json({ error: 'Invalid input' })
    let { postId, body } = result.value

    let post = await Post.getById(postId)
    if (!post) return response.status(404).json({ error: 'Post not found' })

    let comment = await Comment.create(postId, request.user!.id, body)
    return response.status(201).json(comment)
  },
  async getById(request:Request, response:Response) {
    let result = await validate(schema.params, request.params)
    if (!result.ok) return response.status(400).json({ error: 'Invalid comment ID' })

    let comment = await Comment.getById(result.value.id)
    return response.json(comment)
  },
  async getByPostId(request: Request, response: Response) {
    let result = await validate(schema.params, request.params)
    if (!result.ok) return response.status(400).json({ error: 'Invalid post ID' })

    let comments = await Comment.getByPostId(result.value.id)
    return response.json(comments)
  },
  async update(request: Request, response: Response) {
    let params = await validate(schema.params, request.params)
    if (!params.ok) return response.status(400).json({ error: 'Invalid comment ID' })

    let body = await validate(schema.update, request.body)
    if (!body.ok) return response.status(400).json({ error: 'Invalid input' })

    let comment = await Comment.getById(params.value.id)
    if (!comment) return response.status(404).json({ error: 'Comment not found' })
    if (comment.author.id != request.user!.id) return response.status(403).json({ error: 'Forbidden' })

    let updated = await Comment.update(params.value.id, body.value.body)
    return response.json(updated)
  },
  async remove(request: Request, response: Response) {
    let result = await validate(schema.params, request.params)
    if (!result.ok) return response.status(400).json({ error: 'Invalid comment ID' })

    let comment = await Comment.getById(result.value.id)
    if (!comment) return response.status(404).json({ error: 'Comment not found' })

    let isAuthor = comment.author.id == request.user!.id
    let isAdmin = request.user!.role == 'admin'
    if (!isAuthor && !isAdmin) return response.status(403).json({ error: 'Forbidden' })

    await Comment.remove(result.value.id)
    return response.status(200).json({ ok: true })
  },
}
