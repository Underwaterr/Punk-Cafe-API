import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, request } from '../test-utilities.ts'

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
    let response = await request.authenticated.get('secret')
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.deepEqual(data, { ok: true })
  })
})
