import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, baseUrl } from '../test-utilities.ts'

before(startServer)
after(stopServer)

describe('GET /', ()=> {
  it('returns ok', async ()=> {
    let response = await fetch(baseUrl + '/')
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.deepEqual(data, { ok: true })
  })
})
