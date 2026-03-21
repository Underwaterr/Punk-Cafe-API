import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import { rm } from 'node:fs/promises'
import argon2 from 'argon2'
import generateToken from './server/token-generator.ts'
import app from './server/app.ts'
import prisma from '#prisma'
import sharp from 'sharp'

let server: Server
let baseUrl: string
let cachedImage: Buffer

export async function createTestImage() {
  if (cachedImage) return cachedImage
  let redSquare = { width:800, height:800, channels:3, background:'red' } as const
  cachedImage = await sharp({ create: redSquare }).png().toBuffer()
  return cachedImage
}

export function startServer() {
  server = app.listen(0) // OS will assign a random available port
  let address = server.address()
  assert.ok(address != null, "Server address is not null")
  assert.ok(typeof address != 'string', "Address is not a string")
  baseUrl = `http://localhost:${address.port}/`
}

export async function stopServer() {
  server.close()
  await prisma.$disconnect()
}

export async function cleanup() {
  let resetDatabaseQuery = `TRUNCATE users, user_authentication, sessions, invitations, posts, post_images CASCADE`
  await prisma.$executeRawUnsafe(resetDatabaseQuery)
  await rm(process.env.UPLOAD_DIRECTORY, { recursive: true, force: true })
}

export { baseUrl }

export async function createTestUser(username:string, email:string, password:string='test-password-123') {
  let passwordHash = await argon2.hash(password, { memoryCost: 1024, timeCost: 1, parallelism: 1 })
  let user = await prisma.user.create({
    data: {
      username,
      email,
      authentication: { create: { passwordHash } },
    },
  })
  let token = generateToken()
  let session = await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })
  return { user, session, token }
}
