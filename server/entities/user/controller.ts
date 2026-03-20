import type { Request, Response } from 'express'
import User from './model.ts'
import schema from './schema.ts'
import validate from '#validator'

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
  }
}
