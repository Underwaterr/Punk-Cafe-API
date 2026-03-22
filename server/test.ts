import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser } from '#test'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('GET /', ()=> {
  it('returns ok', async ()=> {
    let response = await request.get('')
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.deepEqual(data, { ok: true })
  })
})

describe('GET /secret', ()=> {
  it('returns ok', async ()=> {
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let response = await request.withToken(token).get('secret')
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.deepEqual(data, { ok: true })
  })
})
