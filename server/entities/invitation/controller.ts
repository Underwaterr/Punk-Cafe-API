import type { Request, Response } from 'express'
import Invitation from './model.ts'

export default {
  async create(request:Request, response:Response) {
    let invitation = await Invitation.create(request.user!.id)
    return response.status(201).json(invitation)
  },
  async mine(request:Request, response:Response) {
    let currentUserId = request.user!.id 
    let invitations = await Invitation.getByUser(currentUserId)
    return response.json(invitations)
  },
}
