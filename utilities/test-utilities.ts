import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import { rm, mkdir } from 'node:fs/promises'
import argon2 from 'argon2'
import { generateToken, hashToken } from '#tokens'
import app from '../server/app.ts'
import prisma from '#prisma'
import sharp from 'sharp'
import request from '#request'

let server: Server
let baseUrl: string
let cachedImage: Buffer

export async function createTestImage() {
  if (cachedImage) return cachedImage
  let redSquare = { width:800, height:800, channels:3, background:'red' } as const
  cachedImage = await sharp({ create: redSquare }).png().toBuffer()
  return cachedImage
}

export async function createPost(token:string) {
  let image = await createTestImage()
  let response = await request.withToken(token).uploadImage('posts', image, 'photo.png')
  return await response.json()
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
  let resetDatabaseQuery = `TRUNCATE users, user_authentication, sessions, invitations, posts, post_images, password_reset_codes, likes, comments CASCADE`
  await prisma.$executeRawUnsafe(resetDatabaseQuery),
  await rm(process.env.UPLOAD_DIRECTORY, { recursive: true, force: true })
  await mkdir(process.env.UPLOAD_DIRECTORY, { recursive: true })
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
  const ONE_MONTH = 30 * 24 * 60 * 60 * 1000
  let session = await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + ONE_MONTH),
    },
  })
  return { user, session, token }
}
