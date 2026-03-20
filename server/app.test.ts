import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, request } from '../test-utilities.ts'

before(startServer)
after(stopServer)

describe('GET /', ()=> {
  it('returns ok', async ()=> {
    let response = await request()
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.deepEqual(data, { ok: true })
  })
})
