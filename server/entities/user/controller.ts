import type { Request, Response } from 'express'
import User from './model.ts'
import schema from './schema.ts'
import validate from '#validator'
import { processAvatar } from '../../image-process.ts'

export default {

  async getAll(_request:Request, response:Response) {
    let users = await User.getAll()
    response.json(users)
  },

  async getById(request:Request, response:Response) {

    // validate parameters
    let result = await validate(schema, request.params)
    if (result.isErr()) return response.status(400).json({error: 'Invalid user ID'})

    // validate database
    let userId = result.value.id
    let user = await User.getById(userId)
    if (user == null) return response.status(404).json({ error: 'User not found' })

    return response.json(user)
  },

  async getMe(request:Request, response:Response) {
    return response.json(request.user)
  },

  async updateAvatar(request:Request, response:Response) {
    if (!request.file) return response.status(400).json({ error: 'Image required' })

    let avatarPath = await processAvatar(request.file.buffer)
    let user = await User.updateAvatar(request.user!.id, avatarPath)

    return response.json(user)
  }
}
