import type { Request, Response } from 'express'
import validate from '#validate'
import Invitation from './model.ts'
import schema from './schema.ts'

export default {
  async create(request:Request, response:Response) {
    let result = await validate(schema.create, request.body)
    if (!result.ok) return response.status(400).json({error: 'Invalid name'})
    let userId = request.user!.id
    let realName = result.value.realName
    let invitation = await Invitation.create(userId, realName)
    return response.status(201).json(invitation)
  },
  async mine(request:Request, response:Response) {
    let currentUserId = request.user!.id 
    let invitations = await Invitation.getByUser(currentUserId)
    return response.json(invitations)
  },
}
