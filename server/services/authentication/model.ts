import prisma from '#prisma'
import argon2 from 'argon2'
import generateCode from '#generate-code'
import { generateToken, hashToken } from '#tokens'
import { ResetPasswordError } from './errors.ts'

// speed up argon2 hashing when testing
let hashOptions = (process.env.NODE_ENV == 'test')
  ? { memoryCost: 1024, timeCost: 1, parallelism: 1 } 
  : null

export default {
  findInvitation(code:string) {
    return prisma.invitation.findUnique({ where:{code} })
  },
  findUserByEmail(email:string) {
    return prisma.user.findUnique({ where:{email} })
  },
  findUserByEmailWithAuth(email:string) {
    return prisma.user.findUnique({
      where: { email },
      include: { authentication: true },
    })
  },
  async registerUser(realName:string, email:string, password:string, code:string) {
    let passwordHash = await argon2.hash(password, hashOptions)

    return prisma.$transaction(async tx=> {
      // Get the user's name from the invite
      let invite = await tx.invitation.findUnique({ where:{code} })
      // Create the User
      let user = await tx.user.create({
        data: { realName: invite.realName, email, authentication: { create: { passwordHash } } }
      })
      // Mark invite code as used
      await tx.invitation.update({
        where: { code },
        data: {
          redeemedBy: user.id,
          redeemedAt: new Date(),
        },
      })
      return user
    })
  },
  async createSession(userId:string) {
    let token = generateToken()
    let tokenHash = hashToken(token)
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
    let expiresAt = new Date(Date.now() + THIRTY_DAYS)
    let data = { tokenHash, userId, expiresAt }
    let session = await prisma.session.create({
      data: { tokenHash, userId, expiresAt },
      select: { id: true, expiresAt: true, createdAt: true },
    })
    return { ...session, token }
  },
  findSession(token:string) {
    return prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    })
  },
  deleteSession(token:string) {
    return prisma.session.delete({ where: { tokenHash: hashToken(token) } })
  },
  deleteOtherSessions(userId:string, currentToken:string) {
    return prisma.session.deleteMany({
      where: {
        userId,
        tokenHash: { not: hashToken(currentToken) },
      },
    })
  },
  incrementFailedAttempts(id:string, lockUntil:Date|null=null) { 
    return prisma.userAuthentication.update({
      where: { id },
      data: {
        failedAttempts: { increment: 1 },
        lockedUntil: lockUntil ?? null,
      },
    })
  },
  resetFailedAttempts(id:string) {
    return prisma.userAuthentication.update({
      where: { id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    })
  },

  // You are logged in and want to change your password
  // This logs you out of all other sessions
  async changePassword(userId:string, currentPassword:string, newPassword:string) {
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { authentication: true },
    })

    if (!user?.authentication) return { error: 'no auth found' }

    let valid = await argon2.verify(user.authentication.passwordHash, currentPassword)
    if (!valid) return { error: 'wrong password' }

    let passwordHash = await argon2.hash(newPassword, hashOptions)

    await prisma.userAuthentication.update({
      where: { id: user.authentication.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    })

    return { error: null }
  },

  // You are not logged in and you forgot your password
  // requires a code given to the user from the admin
  async resetPassword(code: string, newPassword: string) {
    let resetCode = await prisma.passwordResetCode.findUnique({ 
      where: {code} 
    })

    if (!resetCode) return { error: ResetPasswordError.INVALID_CODE }
    if (resetCode.usedAt) return { error: ResetPasswordError.CODE_USED }
    if (resetCode.expiresAt < new Date()) return { error: ResetPasswordError.CODE_EXPIRED }

    let passwordHash = await argon2.hash(newPassword, hashOptions)

    await prisma.$transaction(async tx=> {
      await tx.userAuthentication.update({
        where: { userId: resetCode.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          failedAttempts: 0,
          lockedUntil: null,
        },
      })

      await tx.passwordResetCode.update({
        where: { code },
        data: { usedAt: new Date() },
      })

      await tx.session.deleteMany({
        where: { userId: resetCode.userId },
      })
    })

    return { error: null }
  },
  async createPasswordResetCode(id: string) {
    let user = await prisma.user.findUnique({ 
      where: { id } 
    })

    if (!user) return null

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    let expiresAt = new Date(Date.now() + TWENTY_FOUR_HOURS)

    return prisma.$transaction(async tx=> {
      let code: string
      let attempts = 0

      // keep generating password reset codes until we get one that is unique
      while (true) {
        code = generateCode()
        let existing = await tx.passwordResetCode.findUnique({ where: { code } })
        if (!existing) break
        attempts++
        // attempt up to ten times to avoid bugs that lead to an infinite loop!
        if (attempts >= 10) throw new Error('Failed to generate unique reset code')
      }

      return tx.passwordResetCode.create({
        data: { code, userId: user.id, expiresAt },
      })
    })
  }
}
