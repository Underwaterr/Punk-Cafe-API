import type { Request, Response } from 'express'
import User from './model.ts'

export default {
  async getAll(_request:Request, response:Response) {
    let users = await User.getAll()
    response.json(users)
  },
  async getById(request:Request, response:Response) {
    let userId = request.params['id']
    let user = await User.getById(userId)
    response.json(user)
  }
}
