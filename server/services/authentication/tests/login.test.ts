import { describe, it, before, beforeEach, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser } from '#test'
import prisma from '#prisma'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('POST /authentication/login', () => {
  it('returns a session token on valid credentials', async () => {
    // Arrange
    let newUser = { email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser('Nermal', newUser.email, newUser.password)

    // Act
    let response = await request.post('authentication/login', newUser)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.ok(data.session.token)
    assert.ok(data.session.expiresAt)
    assert.equal(data.user.realName, 'Nermal')
  })

  it('returns 401 for a wrong password', async () => {
    // Arrange
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: newUser.email, password: 'bad-password' }

    // Act
    let response = await request.post('authentication/login', badLogin)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 401)
    assert.equal(data.error, 'Invalid email or password')
  })

  it('returns 401 for a wrong email', async () => {
    // Arrange
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: 'bad@example.com', password: newUser.password }

    // Act
    let response = await request.post('authentication/login', badLogin)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 401)
    assert.equal(data.error, 'Invalid email or password')
  })

  it('returns 400 for invalid email', async () => {
    // Arrange
    let newUser = { email: 'invalid-email', password: 'valid-password' }

    // Act
    let response = await request.post('authentication/login', newUser)

    // Assert
    assert.equal(response.status, 400)
  })

  it('increments failed attempts on wrong password', async () => {
    // Arrange
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: newUser.email, password: 'bad-password' }

    // Act
    await request.post('authentication/login', badLogin)

    // Assert
    let testUser = await prisma.user.findUnique({
      where: { email: newUser.email },
      include: { authentication: true },
    })
    assert.equal(testUser?.authentication?.failedAttempts, 1)
  })

  it('resets failed attempts on successful login', async () => {
    // Arrange
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: newUser.email, password: 'bad-password' }
    await request.post('authentication/login', badLogin)
    let goodLogin = { email: newUser.email, password: newUser.password }

    // Act
    await request.post('authentication/login', goodLogin)

    // Assert
    let testUser = await prisma.user.findUnique({
      where: { email: newUser.email },
      include: { authentication: true },
    })
    assert.equal(testUser?.authentication?.failedAttempts, 0)
  })

  it('locks account after 5 failed attempts', async () => {
    // Arrange
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: newUser.email, password: 'bad-password' }
    for (let i = 0; i < 5; i++) await request.post('authentication/login', badLogin)

    // Act
    let response = await request.post('authentication/login', badLogin)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 423)
    assert.equal(data.error, 'Account locked. Try again later.')
  })

  it('unlocks account after lockout period expires', async () => {
    // Arrange
    mock.timers.enable({ apis: ['Date'] })
    let newUser = { name: 'nermal', email: 'cutie@example.com', password: 'cool-password-69' }
    await createTestUser(newUser.name, newUser.email, newUser.password)
    let badLogin = { email: newUser.email, password: 'bad-password' }
    for (let i = 0; i < 5; i++) await request.post('authentication/login', badLogin)
    const FIFTEEN_MINUTES = 15 * 60 * 1000
    mock.timers.tick(FIFTEEN_MINUTES)
    let goodLogin = { email: newUser.email, password: newUser.password }

    // Act
    let response = await request.post('authentication/login', goodLogin)

    // Assert
    assert.equal(response.status, 200)
    mock.timers.reset()
  })
})
