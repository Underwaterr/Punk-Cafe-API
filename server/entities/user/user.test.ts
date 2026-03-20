import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { baseUrl, startServer, stopServer } from '#test'
import prisma from '#prisma'

before(startServer)
after(async function() {
  stopServer()
  await prisma.$disconnect()
})

describe('GET /users', ()=> {

  it('returns an empty array when no users exist', async () => {
    let response = await fetch(`${baseUrl}/users`)
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.deepEqual(data, [])
  })

  /*
  it('returns an empty array when no users exist', async () => {
    let response = await fetch(`${baseUrl}/users`)
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.deepEqual(data, [])
  })

  it('returns all users', async () => {
    await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
      }
    })

    let response = await fetch(`${baseUrl}/users`)
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.length, 1)
    assert.equal(data[0].username, 'testuser')
  })

  it('does not expose email', async () => {
    await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
      }
    })

    let response = await fetch(`${baseUrl}/users`)
    let data = await response.json()

    assert.equal(data[0].email, undefined)
  })
  */
})

/*
describe('GET /users', () => {
  it('returns an empty array when no users exist', async () => {
    let response = await fetch(`${baseUrl}/users`)
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.deepEqual(data, [])
  })

  it('returns all users', async () => {
    await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
      }
    })

    let response = await fetch(`${baseUrl}/users`)
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.length, 1)
    assert.equal(data[0].username, 'testuser')
  })

  it('does not expose email', async () => {
    await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
      }
    })

    let response = await fetch(`${baseUrl}/users`)
    let data = await response.json()

    assert.equal(data[0].email, undefined)
  })
})

describe('GET /users/:id', () => {
  it('returns a user by id', async () => {
    let created = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
      }
    })

    let response = await fetch(`${baseUrl}/users/${created.id}`)
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.username, 'testuser')
    assert.equal(data.id, created.id)
  })

  it('returns 404 for nonexistent user', async () => {
    let response = await fetch(`${baseUrl}/users/00000000-0000-0000-0000-000000000000`)
    let data = await response.json()

    assert.equal(response.status, 404)
    assert.equal(data.error, 'User not found')
  })
})
*/
