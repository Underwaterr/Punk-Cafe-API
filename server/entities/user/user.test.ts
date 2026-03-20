import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, resetDatabase, request } from '#test'
import prisma from '#prisma'

before(startServer)
beforeEach(resetDatabase)
after(stopServer)

describe('GET /users', ()=> {

  it('returns an empty array when no users exist', async ()=> {
    let response = await request('users')
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.deepEqual(data, [])
  })

  it('returns all users', async ()=> {
    let user = { data: { username: 'garfield', email: 'garf@example.com' } }
    await prisma.user.create(user)
    let response = await request('users')
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.equal(data.length, 1)
    assert.equal(data[0].username, 'garfield')
  })

  it('does not expose email', async () => {
    let user = { data: { username: 'garfield', email: 'garf@example.com' } }
    await prisma.user.create(user)
    let response = await request('users')
    let data = await response.json()
    assert.equal(data[0].email, undefined)
  })
})

describe('GET /users/:id', () => {
  it('returns a user by id', async () => {
    let user = { data: { username: 'garfield', email: 'garf@example.com' } }
    let created = await prisma.user.create(user)
    let response = await request('users/' + created.id)
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.equal(data.username, 'garfield')
    assert.equal(data.id, created.id)
  })

  it('returns 400 for an invalid UUID', async () => {
    let response = await request('users/not-a-uuid')
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid user ID')
  })

  it('returns 400 for a numeric ID', async () => {
    let response = await request('users/123')
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid user ID')
  })

  it('returns 404 for nonexistent user', async () => {
    let response = await request('users/00000000-0000-0000-0000-000000000000')
    let data = await response.json()
    assert.equal(response.status, 404)
    assert.equal(data.error, 'User not found')
  })
})
