import type { Request, Response } from 'express'
import argon2 from 'argon2'
import schemas from './schemas.ts'
import validate from '#validate'
import Authentication from './model.ts'

export default {
  async register(request:Request, response:Response) {
    // Validate request body
    let result = await validate(schemas.registration, request.body)
    if (!result.ok) return response.status(400).json({ error: 'Invalid input' })
    let { email, password, code } = result.value

    // Confirm invitation code
    let invitation = await Authentication.findInvitation(code)
    if (!invitation) return response.status(400).json({ error: 'Invalid invite code' })
    if (invitation.redeemedBy) return response.status(400).json({ error: 'Invite code already used' })
    let invitationExpired = (invitation.expiresAt && invitation.expiresAt < new Date())
    if (invitationExpired) return response.status(400).json({ error: 'Invite code expired' })

    // Confirm unique email
    let emailAlreadyExists = await Authentication.findUserByEmail(email)
    if (emailAlreadyExists) return response.status(409).json({ error: 'Email already taken' })
 
    // Create the user
    let user = await Authentication.registerUser( email, password, code)
    let session = await Authentication.createSession(user.id)

    return response.status(201).json({ user, session })
  },
  async login (request:Request, response:Response) {
    // Validate request body
    let result = await validate(schemas.login, request.body)
    if (!result.ok) return response.status(400).json({ error: 'Invalid input' })
    let { email, password } = result.value

    // Confirm user Exists
    let user = await Authentication.findUserByEmailWithAuth(email)
    if (!user) return response.status(401).json({ error: 'Invalid email or password' })
    if (!user.authentication) return response.status(401).json({ error: 'Missing authentication' })

    // Confirm user is not locked out
    let userIsLockedOut = (user.authentication.lockedUntil && user.authentication.lockedUntil > new Date()) 
    if (userIsLockedOut) return response.status(423).json({ error: 'Account locked. Try again later.' })

    // Confirm password
    let validPassword = await argon2.verify(user.authentication.passwordHash, password)
    if (!validPassword) {
      let attempts = user.authentication.failedAttempts + 1
      let lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null 
      await Authentication.incrementFailedAttempts(user.authentication.id, lockUntil)
      return response.status(401).json({ error: 'Invalid email or password' })
    }

    // Valid login!! 
    await Authentication.resetFailedAttempts(user.authentication.id)
    let session = await Authentication.createSession(user.id)
    return response.status(200).json({session, user})
  },
  // someone could POST garbage to the logout endpoint 
  // so to prevent the controller from trying to delete a nonexistent session
  // we'll check to see that the token is valid
  async logout(request:Request, response:Response) {
    // Check for token
    let header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) return response.status(401).json({ error: 'Missing token' })

    // Confirm token
    let token = header!.slice(7)
    let session = await Authentication.findSession(token)
    if (!session) return response.status(401).json({ error: 'Invalid token' })

    // Valid session token, log out!
    await Authentication.deleteSession(token)
    return response.status(200).json({ ok: true })
  },
  async changePassword(request:Request, response:Response) {
    let result = await validate(schemas.passwordChange, request.body)
    if (!result.ok) return response.status(400).json({ error: 'Invalid input' })

    let { currentPassword, newPassword } = result.value
    let outcome = await Authentication.changePassword(request.user!.id, currentPassword, newPassword)
    if (outcome.error == 'no auth found') return response.status(500).json({ error: 'Authentication record not found' })
    if (outcome.error == 'wrong password') return response.status(401).json({ error: 'Current password is incorrect' })

    await Authentication.deleteOtherSessions(request.user!.id, request.sessionToken!)

    return response.status(200).json({ ok: true })
  },
  async createPasswordResetCode(request:Request, response:Response) {
    if (request.user!.role != 'admin') return response.status(403).json({ error: 'Forbidden' })

    let result = await validate(schemas.createPasswordResetCode, request.body)
    if (!result.ok) return response.status(400).json({ error: 'Invalid input' })

    let resetCode = await Authentication.createPasswordResetCode(result.value.id)
    if (!resetCode) return response.status(404).json({ error: 'User not found' })

    return response.status(201).json(resetCode)
  },
  async resetPassword(request: Request, response: Response) {
    let result = await validate(schemas.resetPassword, request.body)
    if (!result.ok) return response.status(400).json({ error: 'Invalid input' })

    let { code, newPassword } = result.value
    let outcome = await Authentication.resetPassword(code, newPassword)
    if(outcome.error) return response.status(outcome.error.status).json({ error: outcome.error.message })

    return response.status(200).json({ ok: true })
  }
}
