import { describe, it, before, beforeEach, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, resetDatabase, request } from '#test'
import prisma from '#prisma'

before(startServer)
beforeEach(resetDatabase)
after(stopServer)

let user = { 
  username: 'garfield', 
  email: 'garf@example.com', 
  password: '12345678yeah', 
  code: 'test-invite-code'
}

async function createInvitation() {
  let inviter = await prisma.user.create({
    data: {
      username: 'inviter',
      email: 'inviter@example.com',
      authentication: { create: { passwordHash: 'not-real' } },
    },
  })
  return await prisma.invitation.create({
    data: {
      code: 'test-invite-code',
      invitedBy: inviter.id,
    },
  })
}

async function registerUser() {
  let invitation = await createInvitation()
  // we must do it thru the endpoint to make sure the password gets hashed
  return await request.post('authentication/register', { ...user, code: invitation.code })
}

describe('POST /authentication/register', ()=> {

  it('creates a user and returns a session token', async ()=> {
    await createInvitation()
    let response = await request.post('authentication/register', user)
    let data = await response.json()
    assert.equal(response.status, 201)
    assert.ok(data.session.token)
    assert.ok(data.session.expiresAt)
    assert.equal(data.user.username, 'garfield')
  })
  it('redeems the invitation', async ()=> {
    await createInvitation()
    await request.post('authentication/register', user)
    let invitation = await prisma.invitation.findUnique({
      where: { code: 'test-invite-code' }
    })
    assert.ok(invitation?.redeemedBy)
    assert.ok(invitation?.redeemedAt)
  })

  it('returns 400 for invalid username', async ()=> {
    let badUser = { ...user, username: '' }
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for invalid password', async ()=> {
    let badUser = { ...user, password: 'short' }
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for invalid email', async ()=> {
    let badUser = { ...user, email: 'invalid-email' }
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for an invalid invite code', async ()=> {
    let badUser = { ...user, code: 'invalid-code' }
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid invite code')
  })
  
  it('returns 400 for an already redeemed invite code', async ()=> {
    let invitation = await createInvitation()
    await prisma.invitation.update({
      where: { code: invitation.code },
      data: {
        redeemedBy: invitation.invitedBy,
        redeemedAt: new Date(),
      },
    })
    let response = await request.post('authentication/register', user)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invite code already used')
  })

  it('returns 409 for a duplicate username', async ()=> {
    await createInvitation()
    await prisma.user.create({
      data: {
        username: user.username,
        email: 'unique@example.com',
        authentication: { create: { passwordHash: 'not-real' } },
      },
    })
    let response = await request.post('authentication/register', user)
    let data = await response.json()
    assert.equal(response.status, 409)
    assert.equal(data.error, 'Username already taken')
  })
  
  it('returns 409 for a duplicate email', async ()=> {
    await createInvitation()
    await prisma.user.create({
      data: {
        username: 'unique',
        email: user.email,
        authentication: { create: { passwordHash: 'not-real' } },
      },
    })
    let response = await request.post('authentication/register', user)
    let data = await response.json()
    assert.equal(response.status, 409)
    assert.equal(data.error, 'Email already taken')
  })
})

describe('POST /authentication/login', ()=> {
  it('returns a session token on valid credentials', async ()=> {
    await registerUser()

    let body = { email: user.email, password: user.password }
    let response = await request.post('authentication/login', body)
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.ok(data.session.token)
    assert.ok(data.session.expiresAt)
    assert.equal(data.user.username, 'garfield')
  })

  it('returns 401 for a wrong password', async ()=> {
    await registerUser()
    let body = { email: user.email, password: 'bad-password' }
    let response = await request.post('authentication/login', body)
    let data = await response.json()
    assert.equal(response.status, 401)
    assert.equal(data.error, 'Invalid email or password')
  })

  it('returns 401 for a wrong email', async ()=> {
    await registerUser()
    let body = { email: 'bad@example.com', password: user.password }
    let response = await request.post('authentication/login', body)
    let data = await response.json()
    assert.equal(response.status, 401)
    assert.equal(data.error, 'Invalid email or password')
  })

  it('returns 400 for invalid email', async ()=> {
    let body = { email: 'invalid', password: user.password }
    let response = await request.post('authentication/login', body)
    assert.equal(response.status, 400) 
  })

  it('increments failed attempts on wrong password', async ()=> {
    await registerUser()
    let body = { email: user.email, password: 'bad-password' }
    await request.post('authentication/login', body)
    let testUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { authentication: true },
    })
    assert.equal(testUser?.authentication?.failedAttempts, 1)
  })

  it('resets failed attempts on successful login', async ()=> {
    await registerUser()

    let body = { email: user.email, password: 'bad-password' }
    await request.post('authentication/login', body)

    body.password = user.password
    await request.post('authentication/login', body)

    let testUser = await prisma.user.findUnique({
      where: { email: user.email },
      include: { authentication: true },
    })

    assert.equal(testUser?.authentication?.failedAttempts, 0)
  })

  it('locks account after 5 failed attempts', async ()=> {
    await registerUser()

    let body = { email: user.email, password: 'bad-password' }
    for (let i=0; i<5; i++) await request.post('authentication/login', body)

    let response = await request.post('authentication/login', body)
    let data = await response.json()

    assert.equal(response.status, 423)
    assert.equal(data.error, 'Account locked. Try again later.')
  })

  it('unlocks account after lockout period expires', async ()=> {
    // mock the clock!
    mock.timers.enable({ apis: ['Date'] })
    await registerUser()

    let body = { email: user.email, password: 'bad-password' }
    for (let i=0; i<5; i++) await request.post('authentication/login', body)
    
    // let's pretend 15 minutes have passed
    mock.timers.tick(15 * 60 * 1000)

    body.password = user.password
    let response = await request.post('authentication/login', body)
    assert.equal(response.status, 200)

    mock.timers.reset()
  })
    
})
