import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser } from '#test'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('GET /sessions', () => {
  it('returns the current users sessions', async () => {
    let { token } = await createTestUser('alice', 'alice@example.com')

    let response = await request.withToken(token).get('sessions')
    let data = await response.json()

    assert.equal(data.length, 1)
    assert.equal(data[0].isCurrent, true)
  })

  it('shows multiple sessions', async () => {
    let { token } = await createTestUser('alice', 'alice@example.com', 'password-123456')

    // log in again to create a second session
    await request.post('authentication/login', {
      email: 'alice@example.com',
      password: 'password-123456',
    })

    let response = await request.withToken(token).get('sessions')
    let data = await response.json()

    assert.equal(data.length, 2)

    let current = data.filter((s: any) => s.isCurrent)
    let other = data.filter((s: any) => !s.isCurrent)
    assert.equal(current.length, 1)
    assert.equal(other.length, 1)
  })

  it('does not expose tokens', async ()=> {
    let { token } = await createTestUser('alice', 'alice@example.com')

    let response = await request.withToken(token).get('sessions')
    let data = await response.json()

    assert.equal(data[0].tokenHash, undefined)
  })

  it('does not include other users sessions', async ()=> {
    // Arrange
    let alice = await createTestUser('alice', 'alice@example.com')
    await createTestUser('bob', 'bob@example.com')

    // Act
    let response = await request.withToken(alice.token).get('sessions')
    let data = await response.json()

    // Assert
    assert.equal(data.length, 1)
  })

  it('returns 401 without a token', async ()=> {
    // Arrange
    let { token } = await createTestUser('alice', 'alice@example.com')

    // Act
    let response = await request.get('sessions')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 401)
  })
})

describe('DELETE /sessions/:id', () => {
  it('revokes another session', async () => {
    // Arrange
    let { token } = await createTestUser('alice', 'alice@example.com', 'password-123456')
    let loginResponse = await request.post('authentication/login', {
      email: 'alice@example.com',
      password: 'password-123456',
    })
    let loginData = await loginResponse.json()
    let secondToken = loginData.session.token
    let sessionsResponse = await request.withToken(token).get('sessions')
    let sessions = await sessionsResponse.json()
    let otherSession = sessions.find((s: any) => !s.isCurrent)

    // Act
    let response = await request.withToken(token).delete(`sessions/${otherSession.id}`)
    let check = await request.withToken(secondToken).get('users/me')

    // Assert
    assert.equal(response.status, 200)
    assert.equal(check.status, 401)
  })

  it('cannot revoke current session', async () => {
    let { token } = await createTestUser('alice', 'alice@example.com')

    let sessionsResponse = await request.withToken(token).get('sessions')
    let sessions = await sessionsResponse.json()
    let currentSession = sessions.find((s: any) => s.isCurrent)

    let response = await request.withToken(token).delete(`sessions/${currentSession.id}`)
    assert.equal(response.status, 400)
  })

  it('cannot revoke another users session', async () => {
    let alice = await createTestUser('alice', 'alice@example.com')
    let bob = await createTestUser('bob', 'bob@example.com')

    let sessionsResponse = await request.withToken(bob.token).get('sessions')
    let sessions = await sessionsResponse.json()

    let response = await request.withToken(alice.token).delete(`sessions/${sessions[0].id}`)
    assert.equal(response.status, 403)
  })

  it('returns 404 for nonexistent session', async () => {
    let { token } = await createTestUser('alice', 'alice@example.com')

    let response = await request.withToken(token).delete('sessions/00000000-0000-0000-0000-000000000000')
    assert.equal(response.status, 404)
  })

  it('returns 401 without a token', async ()=> {
    // Arrange
    let { token } = await createTestUser('alice', 'alice@example.com', 'password-123456')
    let loginResponse = await request.post('authentication/login', {
      email: 'alice@example.com',
      password: 'password-123456',
    })
    let loginData = await loginResponse.json()
    let secondToken = loginData.session.token
    let sessionsResponse = await request.withToken(token).get('sessions')
    let sessions = await sessionsResponse.json()
    let otherSession = sessions.find((s: any) => !s.isCurrent)

    // Act
    let response = await request.delete(`sessions/${otherSession.id}`)

    // Assert
    assert.equal(response.status, 401)
  })
})
