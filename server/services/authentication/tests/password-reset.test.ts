import { describe, it, before, beforeEach, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser } from '#test'
import prisma from '#prisma'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('POST /authentication/password-reset-code', () => {
  it('creates a reset code as admin', async () => {
    // Arrange
    let arlene = await createTestUser('arlene', 'arlene@example.com')
    await createTestUser('nermal', 'cutie@example.com')
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })

    // Act
    let response = await request.withToken(arlene.token).post('authentication/password-reset-code', {
      email: 'cutie@example.com',
    })
    let data = await response.json()

    // Assert
    assert.equal(response.status, 201)
    assert.ok(data.code)
    assert.ok(data.expiresAt)
  })

  it('returns 403 for non-admin', async () => {
    // Arrange
    let { token } = await createTestUser('nermal', 'cutie@example.com')

    // Act
    let response = await request.withToken(token).post('authentication/password-reset-code', {
      email: 'inviter@example.com',
    })

    // Assert
    assert.equal(response.status, 403)
  })

  it('returns 404 for nonexistent email', async () => {
    // Arrange
    let arlene = await createTestUser('arlene', 'arlene@example.com')
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })

    // Act
    let response = await request.withToken(arlene.token).post('authentication/password-reset-code', {
      email: 'nobody@example.com',
    })

    // Assert
    assert.equal(response.status, 404)
  })
})

describe('POST /authentication/reset-password', () => {
  it('resets password with a valid code', async () => {
    // Arrange
    let email = 'arlene@example.com'
    let oldPassword = 'cool-password-69'
    let newPassword = 'cooler-password-420'
    let arlene = await createTestUser('arlene', email, oldPassword)
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let response = await request.withToken(arlene.token).post('authentication/password-reset-code', { email })
    let { code } = await response.json()

    // Act
    await request.post('authentication/reset-password', { code, newPassword })

    // Assert
    let loginResponse = await request.post('authentication/login', { email, password: newPassword })
    assert.equal(loginResponse.status, 200)
  })

  it('invalidates all sessions after reset', async () => {
    // Arrange
    let email = 'arlene@example.com'
    let oldPassword = 'cool-password-69'
    let newPassword = 'cooler-password-420'
    let arlene = await createTestUser('arlene', email, oldPassword)
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let secondLogin = await request.post('authentication/login', { email, oldPassword })
    let secondToken = (await secondLogin.json()).token
    let resetResponse = await request.withToken(arlene.token).post('authentication/password-reset-code', { email })
    let { code } = await resetResponse.json()

    // Act
    await request.post('authentication/reset-password', { code, newPassword })

    // Assert
    let arleneTokenResponse = await request.withToken(arlene.token).get('users/me')
    let secondTokenResponse = await request.withToken(secondToken).get('users/me')
    assert.equal(arleneTokenResponse.status, 401)
    assert.equal(secondTokenResponse.status, 401)
  })

  it('returns 400 for invalid code', async () => {
    // Act
    let response = await request.post('authentication/reset-password', {
      code: 'fake-code',
      newPassword: 'brand-new-password',
    })

    // Assert
    assert.equal(response.status, 400)
  })

  it('returns 400 for already used code', async () => {
    // Arrange
    let email = 'arlene@example.com'
    let oldPassword = 'cool-password-69'
    let newPassword = 'cooler-password-420'
    let arlene = await createTestUser('arlene', email, oldPassword)
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let resetResponse = await request.withToken(arlene.token).post('authentication/password-reset-code', { email })
    let { code } = await resetResponse.json()
    await request.post('authentication/reset-password', { code, newPassword })

    // Act
    let response = await request.post('authentication/reset-password', { code, newPassword })

    // Assert
    assert.equal(response.status, 400)
  })

  it('returns 400 for expired code', async () => {
    // Arrange
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

    // Act
    let response = await request.post('authentication/reset-password', { code, newPassword })

    // Assert
    assert.equal(response.status, 400)
    mock.timers.reset()
  })
})
