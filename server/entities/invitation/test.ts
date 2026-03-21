import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser } from '#test'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('POST /invitations', ()=> {
  it('creates an invitation with a generated code', async ()=> {
    let { token } = await createTestUser('Garfield', 'garf@example.com')
    let response = await request.withToken(token).post('invitations')
    let data = await response.json()

    assert.equal(response.status, 201)
    assert.ok(data.code)

    // two lowercase words and a two-digit number separated by hyphens
    let validInvitationRegex = /^[a-z]+-[a-z]+-\d{2}$/
    assert.match(data.code, validInvitationRegex)
  })

  it('returns 401 without a token', async ()=> {
    let response = await request.post('invitations')
    assert.equal(response.status, 401)
  })
})

describe('GET /invitations/mine', ()=> {
  it('returns the current users invitations', async ()=> {
    let { token } = await createTestUser('Garfield', 'garf@example.com')
    await request.withToken(token).post('invitations')
    await request.withToken(token).post('invitations')

    let response = await request.withToken(token).get('invitations/mine')
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.length, 2)
  })

  it('does not include other users invitations', async ()=> {
    let { token } = await createTestUser('Garfield', 'garf@example.com')
    let response = await request.withToken(token).get('invitations/mine')
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.length, 0)
  })

  it('returns 401 without a token', async ()=> {
    let response = await request.get('invitations/mine')
    assert.equal(response.status, 401)
  })
})
