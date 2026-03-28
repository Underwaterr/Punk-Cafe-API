import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser } from '#test'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('POST /invitations', ()=> {
  it('creates an invitation with a generated code', async ()=> {
    // Arrange
    let { token } = await createTestUser('Garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).post('invitations', { realName: 'Pooky'} )
    let data = await response.json()

    // Assert
    assert.equal(response.status, 201)
    assert.ok(data.code)
    assert.equal(data.realName, 'Pooky')

    // two lowercase words and a two-digit number separated by hyphens
    let validInvitationCodeRegex = /^[a-z]+-[a-z]+-\d{2}$/
    assert.match(data.code, validInvitationCodeRegex)
  })

  it('returns 401 without a token', async ()=> {
    // Act
    let response = await request.post('invitations', { realName: 'Pooky'} )

    // Assert
    assert.equal(response.status, 401)
  })
})

describe('GET /invitations/mine', ()=> {
  it('returns the current users invitations', async ()=> {
    // Arrange
    let { token } = await createTestUser('Garfield', 'garf@example.com')
    await request.withToken(token).post('invitations', { realName: 'Pooky' })
    await request.withToken(token).post('invitations', { realName: 'Pooky' })

    // Act
    let response = await request.withToken(token).get('invitations/mine')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.length, 2)
  })

  it('does not include other users invitations', async ()=> {
    // Arrange
    let { token } = await createTestUser('Garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('invitations/mine')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.length, 0)
  })

  it('returns 401 without a token', async ()=> {
    // Act
    let response = await request.get('invitations/mine')

    // Assert
    assert.equal(response.status, 401)
  })
})
