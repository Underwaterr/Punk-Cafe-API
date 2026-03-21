import { describe, it, before, beforeEach, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser } from '#test'
import prisma from '#prisma'
import request from'#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

async function createInvitation(userId:string) {
  return await prisma.invitation.create({
    data: {
      code: 'test-invite-code',
      invitedBy: userId,
    },
  })
}

describe('POST /authentication/register', ()=> {
  let invited = { 
    username: 'nermal', 
    email: 'cutie@example.com', 
    password: '12345678yeah', 
    code: 'test-invite-code'
  }

  it('creates a user and returns a session token', async ()=> {
    let inviter = await createTestUser('arlene', 'arlene@example.com')
    await createInvitation(inviter.user.id)
    let response = await request.post('authentication/register', invited)
    let data = await response.json()
    assert.equal(response.status, 201)
    assert.ok(data.session.token)
    assert.ok(data.session.expiresAt)
    assert.equal(data.user.username, 'nermal')
  })

  it('redeems the invitation', async ()=> {
    let inviter = await createTestUser('arlene', 'arlene@example.com')
    await createInvitation(inviter.user.id)
    await request.post('authentication/register', invited)
    let invitation = await prisma.invitation.findUnique({
      where: { code: 'test-invite-code' }
    })
    // TODO: check the values
    assert.ok(invitation?.redeemedBy)
    assert.ok(invitation?.redeemedAt)
  })

  it('returns 400 for invalid username', async ()=> {
    let badUser = { ...invited, username: '' }
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for invalid password', async ()=> {
    let badUser = { ...invited, password: 'short' }
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for invalid email', async ()=> {
    let badUser = { ...invited, email: 'invalid-email' }
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for an invalid invite code', async ()=> {
    let badUser = { ...invited, code: 'invalid-code' }
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid invite code')
  })
  
  it('returns 400 for an already redeemed invite code', async ()=> {
    let inviter = await createTestUser('arlene', 'arlene@example.com')
    let invitation = await createInvitation(inviter.user.id)
    await prisma.invitation.update({
      where: { code: invitation.code },
      data: {
        redeemedBy: invitation.invitedBy,
        redeemedAt: new Date(),
      },
    })
    let response = await request.post('authentication/register', invited)
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invite code already used')
  })

  it('returns 409 for a duplicate username', async ()=> {
    let inviter = await createTestUser('arlene', 'arlene@example.com')
    await createInvitation(inviter.user.id)
    await createTestUser(invited.username, 'unique@example.com')
    let response = await request.post('authentication/register', invited)
    let data = await response.json()
    assert.equal(response.status, 409)
    assert.equal(data.error, 'Username already taken')
  })
  
  it('returns 409 for a duplicate email', async ()=> {
    let inviter = await createTestUser('arlene', 'arlene@example.com')
    await createInvitation(inviter.user.id)
    await createTestUser('unique', invited.email)
    let response = await request.post('authentication/register', invited)
    let data = await response.json()
    assert.equal(response.status, 409)
    assert.equal(data.error, 'Email already taken')
  })
})

describe('POST /authentication/login', ()=> {
  it('returns a session token on valid credentials', async ()=> {
    let newUser = { email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser('nermal', newUser.email, newUser.password)
    let response = await request.post('authentication/login', newUser)
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.ok(data.session.token)
    assert.ok(data.session.expiresAt)
    assert.equal(data.user.username, 'nermal')
  })

  it('returns 401 for a wrong password', async ()=> {
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: newUser.email, password: 'bad-password' }
    let response = await request.post('authentication/login', badLogin)
    let data = await response.json()
    assert.equal(response.status, 401)
    assert.equal(data.error, 'Invalid email or password')
  })

  it('returns 401 for a wrong email', async ()=> {
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: 'bad@example.com', password: newUser.password } 
    let response = await request.post('authentication/login', badLogin)
    let data = await response.json()
    assert.equal(response.status, 401)
    assert.equal(data.error, 'Invalid email or password')
  })

  it('returns 400 for invalid email', async ()=> {
    let newUser = { email: 'invalid-email', password: 'valid-password' }
    let response = await request.post('authentication/login', newUser)
    assert.equal(response.status, 400) 
  })

  it('increments failed attempts on wrong password', async ()=> {
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: newUser.email, password: 'bad-password' }
    await request.post('authentication/login', badLogin)
    let testUser = await prisma.user.findUnique({
      where: { email: newUser.email },
      include: { authentication: true },
    })
    assert.equal(testUser?.authentication?.failedAttempts, 1)
  })

  it('resets failed attempts on successful login', async ()=> {
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: newUser.email, password: 'bad-password' }
    await request.post('authentication/login', badLogin)
    let goodLogin = { email: newUser.email, password: newUser.password }
    await request.post('authentication/login', goodLogin)
    let testUser = await prisma.user.findUnique({
      where: { email: newUser.email },
      include: { authentication: true },
    })
    assert.equal(testUser?.authentication?.failedAttempts, 0)
  })

  it('locks account after 5 failed attempts', async ()=> {
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: newUser.email, password: 'bad-password' }
    for (let i=0; i<5; i++) await request.post('authentication/login', badLogin)
    let response = await request.post('authentication/login', badLogin)
    let data = await response.json()
    assert.equal(response.status, 423)
    assert.equal(data.error, 'Account locked. Try again later.')
  })

  it('unlocks account after lockout period expires', async ()=> {
    mock.timers.enable({ apis: ['Date'] }) // mock the clock!
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: newUser.email, password: 'bad-password' }
    for (let i=0; i<5; i++) await request.post('authentication/login', badLogin)
    const FIFTEEN_MINUTES = 15 * 60 * 1000
    mock.timers.tick(FIFTEEN_MINUTES)
    let goodLogin = { email: newUser.email, password: newUser.password }
    let response = await request.post('authentication/login', goodLogin)
    assert.equal(response.status, 200)
    mock.timers.reset()
  })
    
})

describe('POST /authentication/logout', () => {
  it('invalidates the session', async () => {
    let { token } = await createTestUser('arlene', 'arlene@example.com')
    let firstResponse = await request.withToken(token).post('authentication/logout')
    let secondResponse = await request.withToken(token).get('users')
    assert.equal(firstResponse.status, 200)
    assert.equal(secondResponse.status, 401)
  })

  it('returns 401 without a token', async () => {
    let response = await request.post('authentication/logout')
    assert.equal(response.status, 401)
  })
})

describe('PUT /authentication/password', ()=> {

  it('invalidates other sessions on password change', async ()=> {
    let login = { email: 'cutie@example.com', password: 'cool-password-69' }
    let nermal = await createTestUser('nermal', login.email, login.password)
    let secondLogin = await request.post('authentication/login', login)
    let secondToken = (await secondLogin.json()).token
    await request.withToken(nermal.token).put('authentication/password', {
      currentPasword: login.password,
      newPassword: 'cooler-password-420'
    })
    let nermalTokenResponse = await request.withToken(nermal.token).get('users/me')
    let secondTokenResponse = await request.withToken(secondToken).get('users/me')
    assert.equal(nermalTokenResponse.status, 200)
    assert.equal(secondTokenResponse.status, 401)
  })

  it('keeps current session valid after password change', async () => {
    let { token } = await createTestUser('nermal', 'cutie@example.com', 'cool-password-69')
    await request.withToken(token).put('authentication/password', {
      currentPassword: 'cool-password-69',
      newPassword: 'new-password-12345',
    })
    let response = await request.withToken(token).get('users/me')
    assert.equal(response.status, 200)
  })
})

describe('POST /authentication/password-reset-code', ()=> {

  it('creates a reset code as admin', async ()=> {
    let arlene = await createTestUser('arlene', 'arlene@example.com')
    await createTestUser('nermal', 'cutie@example.com')
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let response = await request.withToken(arlene.token).post('authentication/password-reset-code', {
      email: 'cutie@example.com',
    })
    let data = await response.json()
    assert.equal(response.status, 201)
    assert.ok(data.code)
    assert.ok(data.expiresAt)
  })

  it('returns 403 for non-admin', async () => {
    let { token } = await createTestUser('nermal', 'cutie@example.com')
    let response = await request.withToken(token).post('authentication/password-reset-code', {
      email: 'inviter@example.com',
    })
    assert.equal(response.status, 403)
  })

  it('returns 404 for nonexistent email', async () => {
    let arlene = await createTestUser('arlene', 'arlene@example.com')
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let response = await request.withToken(arlene.token).post('authentication/password-reset-code', {
      email: 'nobody@example.com',
    })
    assert.equal(response.status, 404)
  })
})

describe('POST /authentication/reset-password', ()=> {

  it('resets password with a valid code', async ()=> {
    let email = 'arlene@example.com'
    let oldPassword = 'cool-password-69'
    let newPassword = 'cooler-password-420'
    let arlene = await createTestUser('arlene', email, oldPassword)
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let response = await request.withToken(arlene.token).post('authentication/password-reset-code', { email })
    let { code } = await response.json()
    await request.post('authentication/reset-password', { code, newPassword })
    let loginResponse = await request.post('authentication/login', { email, password: newPassword })
    assert.equal(loginResponse.status, 200)
  })

  it('invalidates all sessions after reset', async ()=> {
    let email = 'arlene@example.com'
    let oldPassword = 'cool-password-69'
    let newPassword = 'cooler-password-420'
    let arlene = await createTestUser('arlene', email, oldPassword)
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let secondLogin = await request.post('authentication/login', { email, oldPassword } )
    let secondToken = (await secondLogin.json()).token
    let resetResponse = await request.withToken(arlene.token).post('authentication/password-reset-code', { email })
    let { code } = await resetResponse.json()
    await request.post('authentication/reset-password', { code, newPassword })
    let arleneTokenResponse = await request.withToken(arlene.token).get('users/me')
    let secondTokenResponse = await request.withToken(secondToken).get('users/me')
    assert.equal(arleneTokenResponse.status, 401)
    assert.equal(secondTokenResponse.status, 401)
  })

  it('returns 400 for invalid code', async ()=> {
    let response = await request.post('authentication/reset-password', {
      code: 'fake-code',
      newPassword: 'brand-new-password',
    })
    assert.equal(response.status, 400)
  })

  it('returns 400 for already used code', async ()=> {
    let email = 'arlene@example.com'
    let oldPassword = 'cool-password-69'
    let newPassword = 'cooler-password-420'
    let arlene = await createTestUser('arlene', email, oldPassword)
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let resetResponse = await request.withToken(arlene.token).post('authentication/password-reset-code', { email })
    let { code } = await resetResponse.json()
    await request.post('authentication/reset-password', { code, newPassword })
    let response = await request.post('authentication/reset-password', { code, newPassword })
    assert.equal(response.status, 400)
  })

  it('returns 400 for expired code', async ()=> {
    mock.timers.enable({ apis: ['Date'] })
    let email = 'arlene@example.com'
    let oldPassword = 'cool-password-69'
    let newPassword = 'cooler-password-420'
    let arlene = await createTestUser('arlene', email, oldPassword)
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let resetResponse = await request.withToken(arlene.token).post('authentication/password-reset-code', { email })
    let { code } = await resetResponse.json()
    const TWENTY_FIVE_HOURS = 25 * 60 * 60 * 1000
    mock.timers.tick(TWENTY_FIVE_HOURS)
    let response = await request.post('authentication/reset-password', { code, newPassword })
    assert.equal(response.status, 400)
    mock.timers.reset()
  })
})
