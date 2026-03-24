import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser } from '#test'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('POST /authentication/logout', () => {
  it('invalidates the session', async () => {
    // Arrange
    let { token } = await createTestUser('arlene', 'arlene@example.com')

    // Act
    let firstResponse = await request.withToken(token).post('authentication/logout')
    let secondResponse = await request.withToken(token).get('users')

    // Assert
    assert.equal(firstResponse.status, 200)
    assert.equal(secondResponse.status, 401)
  })

  it('returns 401 without a token', async () => {
    // Act
    let response = await request.post('authentication/logout')

    // Assert
    assert.equal(response.status, 401)
  })
})
