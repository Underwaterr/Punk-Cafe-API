import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import app from './server/app.ts'
import prisma from '#prisma'

let server: Server
let baseUrl: string

export function startServer() {
  server = app.listen(0) // OS will assign a random available port
  let address = server.address()
  assert.ok(address != null, "Server address is not null")
  assert.ok(typeof address != 'string', "Address is not a string")
  baseUrl = `http://localhost:${address.port}`
}

export async function stopServer() {
  server.close()
  await prisma.$disconnect()
}

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE users, user_authentication, sessions, invitations CASCADE`
  )
}

export async function request(endpoint:string='', method:string='GET', body?:Record<string, unknown>) {
  let url = baseUrl + '/' + endpoint
  if (method == 'GET') return await fetch(url)
  else return await fetch(url, { 
    method, 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(body)
  })
}
