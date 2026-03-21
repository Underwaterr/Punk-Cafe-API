import prisma from '#prisma'
import argon2 from 'argon2'
import generateToken from './generate-token.ts'

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
  findUserByUsername(username:string) {
    return prisma.user.findUnique({ where:{username} })
  },
  async registerUser(username:string, email:string, password:string, code:string) {
    // speed up hashing when testing
    let hashOptions = (process.env.NODE_ENV == 'test')
      ? { memoryCost: 1024, timeCost: 1, parallelism: 1 } 
      : null
    let passwordHash = await argon2.hash(password, hashOptions)

    return prisma.$transaction(async tx=> {
      // Create the User
      let user = await tx.user.create({
        data: { username, email, authentication: { create: { passwordHash } } }
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
  createSession(userId:string) {
    let token = generateToken()
    let expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days 
    let data = { token, userId, expiresAt }
    return prisma.session.create({ data })
  },
  findSession(token:string) {
    return prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })
  },
  deleteSession(token:string) {
    return prisma.session.delete({ where: {token} })
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
  }
}
