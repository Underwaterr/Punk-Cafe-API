import type { Request, Response } from 'express'
import argon2 from 'argon2'
import schemas from './schemas.ts'
import validate from '#validator'
import Authentication from './model.ts'

export default {
  async register(request:Request, response:Response) {
    // Validate request body
    let result = await validate(schemas.registration, request.body)
    if (result.isErr()) return response.status(400).json({ error: 'Invalid input' })
    let { username, email, password, code } = result.value

    // Confirm invitation code
    let invitation = await Authentication.findInvitation(code)
    if (!invitation) return response.status(400).json({ error: 'Invalid invite code' })
    if (invitation.redeemedBy) return response.status(400).json({ error: 'Invite code already used' })
    let invitationExpired = (invitation.expiresAt && invitation.expiresAt < new Date())
    if (invitationExpired) return response.status(400).json({ error: 'Invite code expired' })

    // Confirm unique email
    let emailAlreadyExists = await Authentication.findUserByEmail(email)
    if (emailAlreadyExists) return response.status(409).json({ error: 'Email already taken' })
 
    // Confirm unique username
    let usernameAlreadyExists = await Authentication.findUserByUsername(username)
    if (usernameAlreadyExists) return response.status(409).json({ error: 'Username already taken' })

    // Create the user
    let user = await Authentication.registerUser( username, email, password, code)
    let session = await Authentication.createSession(user.id)

    return response.status(201).json({ user, session })
  },
  async login (request:Request, response:Response) {
    // Validate request body
    let result = await validate(schemas.login, request.body)
    if (result.isErr()) return response.status(400).json({ error: 'Invalid input' })
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
  }
}
