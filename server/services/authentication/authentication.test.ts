import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, resetDatabase, request } from '#test'
import prisma from '#prisma'

before(startServer)
beforeEach(resetDatabase)
after(stopServer)

async function createInvitation() {
  let inviter = await prisma.user.create({
    data: {
      username: 'inviter',
      email: 'inviter@example.com',
      auth: { create: { passwordHash: 'not-real' } },
    },
  })
  return await prisma.invitation.create({
    data: {
      code: 'test-invite-code',
      invitedBy: inviter.id,
    },
  })
}

describe('POST /authentication', ()=> {
  let user = { 
    username: 'garfield', 
    email: 'garf@example.com', 
    password: '12345678yeah', 
    code: 'test-invite-code'
  }

  it('creates a user and returns a session token', async ()=> {
    await createInvitation()
    let response = await request('authentication/register', 'POST', user)
    let data = await response.json()
    assert.equal(response.status, 201)
    assert.ok(data.session.token)
    assert.ok(data.session.expiresAt)
    assert.equal(data.user.username, 'garfield')
  })

  it('redeems the invitation', async ()=> {
    await createInvitation()
    await request('authentication/register', 'POST', user)
    let invitation = await prisma.invitation.findUnique({
      where: { code: 'test-invite-code' }
    })
    assert.ok(invitation?.redeemedBy)
    assert.ok(invitation?.redeemedAt)
  })

  it('returns 400 for invalid username', async ()=> {
    let badUser = { ...user, username: '' }
    let response = await request('authentication/register', 'POST', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for invalid password', async ()=> {
    let badUser = { ...user, password: 'short' }
    let response = await request('authentication/register', 'POST', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for invalid email', async ()=> {
    let badUser = { ...user, email: 'invalid-email' }
    let response = await request('authentication/register', 'POST', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for an invalid invite code', async () => {
    let badUser = { ...user, code: 'invalid-code' }
    let response = await request('authentication/register', 'POST', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid invite code')
  })
  
  it('returns 400 for an already redeemed invite code', async () => {
    let invitation = await createInvitation()
    await prisma.invitation.update({
      where: { code: invitation.code },
      data: {
        redeemedBy: invitation.invitedBy,
        redeemedAt: new Date(),
      },
    })
    let response = await request('authentication/register', 'POST', user)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invite code already used')
  })

  it('returns 409 for a duplicate username', async () => {
    await createInvitation()
    await prisma.user.create({
      data: {
        username: user.username,
        email: 'unique@example.com',
        auth: { create: { passwordHash: 'not-real' } },
      },
    })
    let response = await request('authentication/register', 'POST', user)
    let data = await response.json()
    assert.equal(response.status, 409)
    assert.equal(data.error, 'Username already taken')
  })
  
  it('returns 409 for a duplicate email', async () => {
    await createInvitation()
    await prisma.user.create({
      data: {
        username: 'unique',
        email: user.email,
        auth: { create: { passwordHash: 'not-real' } },
      },
    })
    let response = await request('authentication/register', 'POST', user)
    let data = await response.json()
    assert.equal(response.status, 409)
    assert.equal(data.error, 'Email already taken')
  })
})
