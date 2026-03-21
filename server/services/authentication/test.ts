import { describe, it, before, beforeEach, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, request, baseUrl } from '#test'
import prisma from '#prisma'

before(startServer)
beforeEach(cleanup)
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

describe('POST /authentication/logout', () => {
  it('invalidates the session', async () => {
    let response = await request.authenticated.post('authentication/logout')
    assert.equal(response.status, 200)

    let second = await request.authenticated.get('users')
    assert.equal(second.status, 401)
  })

  it('returns 401 without a token', async () => {
    let response = await request.post('authentication/logout')
    assert.equal(response.status, 401)
  })
})

describe('PUT /authentication/password', ()=> {
  /*
  it('invalidates other sessions on password change', async ()=> {
    // log in a second time to create a second session
    let loginResponse = await request.post('authentication/login', {
      email: 'odie@example.com',
      password: 'this-is-a-password',
    })
    let secondSession = await loginResponse.json()
    let secondToken = secondSession.session.token

    // change password using the main session
    await request.authenticated.put('authentication/password', {
      currentPassword: 'this-is-a-password',
      newPassword: 'new-password-12345',
    })

    // second session should be invalid
    let response = await fetch(baseUrl + 'users/me', {
      headers: { 'Authorization': 'Bearer ' + secondToken },
    })
    assert.equal(response.status, 401)
  })

  it('keeps current session valid after password change', async () => {
    await request.authenticated.put('authentication/password', {
      currentPassword: 'this-is-a-password',
      newPassword: 'new-password-12345',
    })

    let response = await request.authenticated.get('users/me')
    assert.equal(response.status, 200)
  })
  */
})

/*
describe('POST /authentication/password-reset-code', ()=> {
  async function promoteToAdmin() {
    // trigger user creation first
    let me = await request.authenticated.get('users/me')
    let data = await me.json()
    await prisma.user.update({
      where: { username: data.username },
      data: { role: 'admin' },
    })
  }

  it('creates a reset code as admin', async ()=> {
    await promoteToAdmin()
    // need a target user to create a code for
    let inviteResponse = await request.authenticated.post('invitations')
    let invite = await inviteResponse.json()
    await request.post('authentication/register', {
      username: 'target',
      email: 'target@example.com',
      password: 'test-password-123',
      code: invite.code,
    })
    let response = await request.authenticated.post('authentication/password-reset-code', {
      email: 'target@example.com',
    })
    let data = await response.json()
    assert.equal(response.status, 201)
    assert.ok(data.code)
    assert.ok(data.expiresAt)
  })

  it('returns 403 for non-admin', async () => {
    let response = await request.authenticated.post('authentication/password-reset-code', {
      email: 'inviter@example.com',
    })
    assert.equal(response.status, 403)
  })


  it('returns 404 for nonexistent email', async () => {
    let response = await request.authenticated.post('authentication/password-reset-code', {
      email: 'nobody@example.com',
    })
    assert.equal(response.status, 404)
  })
})

/*
describe('POST /authentication/reset-password', () => {
  async function createResetCode(email: string) {
    await prisma.user.update({
      where: { username: 'odie' },
      data: { role: 'admin' },
    })

    let response = await request.authenticated.post('authentication/reset-codes', {
      email,
    })
    let data = await response.json()
    return data.code as string
  }

  it('resets password with a valid code', async () => {
    await registerUser()
    let code = await createResetCode('inviter@example.com')

    let response = await request.post('authentication/reset-password', {
      code,
      newPassword: 'brand-new-password',
    })

    assert.equal(response.status, 200)

    // can log in with new password
    let loginResponse = await request.post('authentication/login', {
      email: 'inviter@example.com',
      password: 'brand-new-password',
    })

    assert.equal(loginResponse.status, 200)
  })

  it('invalidates all sessions after reset', async () => {
    await registerUser()

    // log in as inviter to get a session
    // inviter doesn't have a real password hash, so create a proper user
    let inviteResponse = await request.authenticated.post('invitations', {})
    let invite = await inviteResponse.json()

    let registerResponse = await request.post('authentication/register', {
      username: 'target',
      email: 'target@example.com',
      password: 'original-password',
      code: invite.code,
    })
    let targetSession = await registerResponse.json()
    let targetToken = targetSession.session.token

    let code = await createResetCode('target@example.com')

    await request.post('authentication/reset-password', {
      code,
      newPassword: 'brand-new-password',
    })

    let response = await fetch(baseUrl + 'users/me', {
      headers: { 'Authorization': 'Bearer ' + targetToken },
    })

    assert.equal(response.status, 401)
  })

  it('returns 400 for invalid code', async () => {
    let response = await request.post('authentication/reset-password', {
      code: 'fake-code',
      newPassword: 'brand-new-password',
    })

    assert.equal(response.status, 400)
  })

  it('returns 400 for already used code', async () => {
    await registerUser()
    let code = await createResetCode('inviter@example.com')

    await request.post('authentication/reset-password', {
      code,
      newPassword: 'brand-new-password',
    })

    let response = await request.post('authentication/reset-password', {
      code,
      newPassword: 'another-password',
    })

    assert.equal(response.status, 400)
  })

  it('returns 400 for expired code', async () => {
    mock.timers.enable({ apis: ['Date'] })

    await registerUser()
    let code = await createResetCode('inviter@example.com')

    const TWENTY_FIVE_HOURS = 25 * 60 * 60 * 1000
    mock.timers.tick(TWENTY_FIVE_HOURS)

    let response = await request.post('authentication/reset-password', {
      code,
      newPassword: 'brand-new-password',
    })

    mock.timers.reset()

    assert.equal(response.status, 400)
  })
})
*/
