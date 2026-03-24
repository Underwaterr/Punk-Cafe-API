import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser } from '#test'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('PUT /authentication/password', () => {
  it('invalidates other sessions on password change', async () => {
    // Arrange
    let login = { email: 'cutie@example.com', password: 'cool-password-69' }
    let nermal = await createTestUser('nermal', login.email, login.password)
    let secondLogin = await request.post('authentication/login', login)
    let secondToken = (await secondLogin.json()).token

    // Act
    await request.withToken(nermal.token).put('authentication/password', {
      currentPasword: login.password,
      newPassword: 'cooler-password-420'
    })

    // Assert
    let nermalTokenResponse = await request.withToken(nermal.token).get('users/me')
    let secondTokenResponse = await request.withToken(secondToken).get('users/me')
    assert.equal(nermalTokenResponse.status, 200)
    assert.equal(secondTokenResponse.status, 401)
  })

  it('keeps current session valid after password change', async () => {
    // Arrange
    let { token } = await createTestUser('nermal', 'cutie@example.com', 'cool-password-69')

    // Act
    await request.withToken(token).put('authentication/password', {
      currentPassword: 'cool-password-69',
      newPassword: 'new-password-12345',
    })

    // Assert
    let response = await request.withToken(token).get('users/me')
    assert.equal(response.status, 200)
  })
})
