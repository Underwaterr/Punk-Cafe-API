import type { Request, Response } from 'express'
import Session from './model.ts'

export default {
  async getByUserId(request:Request, response:Response) {
    let sessions = await Session.getByUserId(request.user!.id)

    let formatted = sessions.map(session=> ({
      ...session,
      isCurrent: session.id == request.sessionId,
    }))

    return response.json(formatted)
  },
  async remove(request:Request, response:Response) {
    let id = request.params.id
    if (typeof id != 'string') return response.status(400).json({ error: 'Invalid session ID' })

    let userId = request.user!.id
    let session = await Session.getById(id)
    if (!session) return response.status(404).json({ error: 'Session not found' })
    if (session.userId != userId) return response.status(403).json({ error: 'Forbidden' })
    if (session.id == request.sessionId) return response.status(400).json({ error: 'Cannot revoke current session. Use logout instead.' })

    await Session.remove(id)
    return response.status(200).json({ ok: true })
  },
}
