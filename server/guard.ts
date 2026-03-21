import type { Request, Response, NextFunction } from 'express'
import Authentication from './services/authentication/model.ts'
import prisma from '#prisma'

export default async function requireAuthentication(request:Request, response:Response, next:NextFunction) {

  let header = request.headers.authorization

  // Confirm token exists
  let isMissingToken = !header?.startsWith('Bearer ')
  if (isMissingToken) return response.status(401).json({ error: 'Missing token' })

  // Find token
  let token = header.slice(7) // extract token from header
  let session = await Authentication.findSession(token)

  // Check token is valid
  if (!session) return response.status(401).json({ error: 'Invalid token' })

  // Check token hasn't expired
  if (session.expiresAt < new Date()) return response.status(401).json({ error: 'Token expired' })

  // update the database (no `await`, we don't want to block the thread!)
  prisma.session.update({ where: {token}, data: { lastActive: new Date() } })

  request.sessionToken = token
  request.user = session.user
  next()
}
