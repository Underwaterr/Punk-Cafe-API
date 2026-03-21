import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import app from './server/app.ts'
import prisma from '#prisma'

let server: Server
let baseUrl: string
let cachedToken: string | null = null

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

export async function resetDatabase() {
  cachedToken = null
  await prisma.$executeRawUnsafe(
    `TRUNCATE users, user_authentication, sessions, invitations CASCADE`
  )
}

export let request = {
  async get(endpoint:string) { 
    return await fetch(baseUrl + endpoint)
  },
  async post(endpoint:string, data:Record<string, unknown>) { 
    let method = 'POST'
    let headers = { 'Content-Type': 'application/json' }
    let body = JSON.stringify(data)
    return await fetch(baseUrl + endpoint, { method, headers, body })
  },
  authenticated: {
    async get(endpoint:string) {
      let token = await getSessionToken()
      let headers = { 'Authorization': 'Bearer ' + token }
      return await fetch(baseUrl + endpoint, { headers })
    },
    async post(endpoint:string, data:Record<string, unknown>) {
      let token = await getSessionToken()
      let method = 'POST'
      let headers = { 
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
      let body = JSON.stringify(data)
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
  let invitation = await prisma.invitation.create({
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
