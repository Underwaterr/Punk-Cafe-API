import type { Request, Response } from 'express'
import Post from './model.ts'
import validate from '#validate'
import schema from './schema.ts'

export default {

  async create(request:Request, response:Response) {
    if (!request.file) return response.status(400).json({ error: 'Image required' })

    let caption = request.body.caption ?? null
    try {
      let post = await Post.create(request.user!.id, caption, request.file.buffer)
      return response.status(201).json(post)
    }
    catch {
      return response.status(400).json({ error: 'Invalid image' })
    }
  },

  async getFeed(request:Request, response:Response) {
    let cursor = request.query.cursor as string | null
    let take = Math.min(Number(request.query.take) || 20, 25) as number // limit take to 25
    let userId = request.user!.id
    let posts = await Post.getFeed(userId, take, cursor)
    let nextCursor = posts.length == take ? posts[posts.length - 1].id : null
    return response.json({
      posts: posts.map(({likes, ...post})=> ({
        ...post,
        likedByMe: (likes.length > 0)
      })),
      nextCursor
    })
  },

  async getById(request: Request, response: Response) {
    let result = await validate(schema, request.params)
    if (result.isErr()) return response.status(400).json({ error: 'Invalid post ID' })

    let userId = request.user!.id
    let post = await Post.getByIdForUser(result.value.id, userId)
    if (!post) return response.status(404).json({ error: 'Post not found' })

    return response.json({
      ...post,
      likedByMe: post.likes.length > 0
    })
  },

  async remove(request: Request, response: Response) {
    // Validate request
    let result = await validate(schema, request.params)
    if (result.isErr()) return response.status(400).json({ error: 'Invalid post ID' })

    // Check if post exists
    let post = await Post.getById(result.value.id)
    if (!post) return response.status(404).json({ error: 'Post not found' })

    // You must either be the author or an admin to delete a post
    let isAuthor = post.author.id == request.user!.id
    let isAdmin = request.user!.role == 'admin'
    if (!isAuthor && !isAdmin) return response.status(403).json({ error: 'Forbidden' })

    await Post.remove(result.value.id)
    return response.status(200).json({ ok: true })
  }
}
