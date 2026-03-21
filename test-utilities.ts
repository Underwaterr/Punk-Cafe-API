import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import { rm } from 'node:fs/promises'
import app from './server/app.ts'
import prisma from '#prisma'
import sharp from 'sharp'
import './env.ts'

let server: Server
let baseUrl: string
let cachedToken: string | null = null
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
  cachedToken = null
  let resetDatabaseQuery = `TRUNCATE users, user_authentication, sessions, invitations, posts, post_images CASCADE`
  await prisma.$executeRawUnsafe(resetDatabaseQuery)
  await rm(process.env.UPLOAD_DIRECTORY, { recursive: true, force: true })
}

export let request = {
  async get(endpoint:string) { 
    return await fetch(baseUrl + endpoint)
  },
  async post(endpoint:string, data:Record<string, unknown> ={}) { 
    let method = 'POST'
    let headers = { 'Content-Type': 'application/json' }
    let body = JSON.stringify(data)
    return await fetch(baseUrl + endpoint, { method, headers, body })
  },
  async put(endpoint: string, data: Record<string, unknown>) {
    let method = 'PUT'
    let headers = { 'Content-Type': 'application/json' }
    let body = JSON.stringify(data)
    return await fetch(baseUrl + endpoint, { method, headers, body })
  },
  async delete(endpoint:string) {
    let method = 'DELETE'
    return await fetch(baseUrl + endpoint, { method })
  },
  authenticated: {
    async get(endpoint:string) {
      let token = await getSessionToken()
      let headers = { 'Authorization': 'Bearer ' + token }
      return await fetch(baseUrl + endpoint, { headers })
    },
    async post(endpoint:string, data:Record<string, unknown> ={}) {
      let token = await getSessionToken()
      let method = 'POST'
      let headers = { 
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
      let body = JSON.stringify(data)
      return await fetch(baseUrl + endpoint, { method, headers, body })
    },
    async put(endpoint:string, data: Record<string, unknown>) {
      let token = await getSessionToken()
      let method = 'PUT'
      let headers = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      }
      let body = JSON.stringify(data)
      return await fetch(baseUrl + endpoint, { method, headers, body })
    },
    async delete(endpoint:string) {
      let token = await getSessionToken()
      let method = 'DELETE'
      let headers = { 'Authorization': 'Bearer ' + token }
      return await fetch(baseUrl + endpoint, { method, headers })
    },
    async uploadImage(endpoint:string, buffer:Buffer, filename:string, caption?:string) {
      let token = await getSessionToken()
      let form = new FormData()
      let blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' })
      form.append('image', blob, filename)
      if (caption) form.append('caption', caption)
      let method = 'POST'
      let headers = { 'Authorization': 'Bearer ' + token }
      let body = form
      return await fetch(baseUrl + endpoint, { method, headers, body })
    }
  }
}

async function getSessionToken() {
  if (cachedToken) return cachedToken
  let inviter = await prisma.user.create({
    data: {
      username: 'inviter',
      email: 'inviter@example.com',
      authentication: { create: { passwordHash: 'not-real' } },
    },
  })
  await prisma.invitation.create({
    data: {
      code: 'test-invite-code',
      invitedBy: inviter.id,
    },
  })
  
  let response = await request.post('authentication/register', {
    username: 'odie',
    email: 'odie@example.com',
    password: 'this-is-a-password',
    code: 'test-invite-code',
  })

  let data = await response.json()
  cachedToken = data.session.token as string
  return cachedToken
}

export async function createAdditionalUser(username:string, email:string) {
  let mainToken = await getSessionToken()

  // create an invitation from the main user
  let inviteResponse = await fetch(baseUrl + 'invitations', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + mainToken },
  })
  let invite = await inviteResponse.json()

  // register the new user
  let registerResponse = await fetch(baseUrl + 'authentication/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      password: 'test-password-123',
      code: invite.code,
    }),
  })

  let data = await registerResponse.json()
  return data.session.token as string
}

export { baseUrl }
