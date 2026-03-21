import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, request, createTestImage } from '#test'
import prisma from '#prisma'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('GET /users', ()=> {

  it('returns all users', async ()=> {
    let user = { data: { username: 'garfield', email: 'garf@example.com' } }
    await prisma.user.create(user)
    let response = await request.authenticated.get('users')
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.equal(data.length, 3)
    assert.equal(data[2].username, 'garfield')
  })

  it('does not expose email', async ()=> {
    let user = { data: { username: 'garfield', email: 'garf@example.com' } }
    await prisma.user.create(user)
    let response = await request.authenticated.get('users')
    let data = await response.json()
    assert.equal(data[0].email, undefined)
  })
})

describe('GET /users/me', () => {
  it('returns the authenticated user', async () => {
    let response = await request.authenticated.get('users/me')
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.equal(data.username, 'odie')
    assert.equal(data.email, 'odie@example.com')
  })

  it('returns 401 without a token', async () => {
    let response = await request.get('users/me')
    assert.equal(response.status, 401)
  })
})  

describe('GET /users/:id', ()=> {
  it('returns a user by id', async ()=> {
    let user = { data: { username: 'garfield', email: 'garf@example.com' } }
    let created = await prisma.user.create(user)
    let response = await request.authenticated.get('users/' + created.id)
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.equal(data.username, 'garfield')
    assert.equal(data.id, created.id)
  })

  it('returns 400 for an invalid UUID', async ()=> {
    let response = await request.authenticated.get('users/not-a-uuid')
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid user ID')
  })

  it('returns 400 for a numeric ID', async ()=> {
    let response = await request.authenticated.get('users/123')
    let data = await response.json()
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid user ID')
  })

  it('returns 404 for nonexistent user', async ()=> {
    let response = await request.authenticated.get('users/00000000-0000-0000-0000-000000000000')
    let data = await response.json()
    assert.equal(response.status, 404)
    assert.equal(data.error, 'User not found')
  })
})

describe('POST /users/me/avatar', () => {
  it('uploads an avatar', async () => {
    let image = await createTestImage()
    let response = await request.authenticated.uploadImage('users/me/avatar', image, 'avatar.png')
    let data = await response.json()
    assert.equal(response.status, 200)
    assert.ok(data.avatarPath)
    assert.match(data.avatarPath, /^avatars\/[\w]+\.webp$/)
  })

  it('returns 400 without an image', async () => {
    let response = await request.authenticated.post('users/me/avatar', {})
    assert.equal(response.status, 400)
  })

  it('serves the uploaded avatar', async () => {
    let image = await createTestImage()
    let uploadResponse = await request.authenticated.uploadImage('users/me/avatar', image, 'avatar.png')
    let data = await uploadResponse.json()
    let response = await request.authenticated.get('images/' + data.avatarPath)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/webp')
  })

  it('returns 401 without a token', async () => {
    let response = await request.get('users/me/avatar')
    assert.equal(response.status, 401)
  })
})

describe('PUT /users/me', () => {
  it('updates display name', async () => {
    let response = await request.authenticated.put('users/me', { displayName: 'Odie the Dog' })
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.displayName, 'Odie the Dog')
  })

  it('updates pronouns', async () => {
    let response = await request.authenticated.put('users/me', { pronouns: 'he/him' })
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.pronouns, 'he/him')
  })

  it('updates bio', async () => {
    let response = await request.authenticated.put('users/me', { bio: "I have no idea what's going on" })
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.bio, "I have no idea what's going on")
  })

  it('updates multiple fields at once', async () => {
    let response = await request.authenticated.put('users/me', {
      displayName: 'Odie the Dog',
      pronouns: 'he/him',
      bio: "I have no idea what's going on",
    })
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.displayName, 'Odie the Dog')
    assert.equal(data.pronouns, 'he/him')
    assert.equal(data.bio, "I have no idea what's going on")
  })

  it('returns 400 for invalid input', async () => {
    let response = await request.authenticated.put('users/me', {
      bio: 'x'.repeat(301),
    })
    assert.equal(response.status, 400)
  })

  it('returns 401 without a token', async () => {
    let response = await request.put('users/me', { displayName: 'test' })
    assert.equal(response.status, 401)
  })
})

describe('DELETE /users/me', () => {
  it('deletes the authenticated user', async () => {
    let response = await request.authenticated.delete('users/me')
    assert.equal(response.status, 200)
  })

  it('invalidates the session after deletion', async () => {
    await request.authenticated.delete('users/me')
    let response = await request.authenticated.get('users/me')
    assert.equal(response.status, 401)
  })

  it('deletes the users posts', async () => {
    let image = await createTestImage()
    let created = await request.authenticated.uploadImage('posts', image, 'photo.png')
    let post = await created.json()

    await request.authenticated.delete('users/me')

    // need a new user to check the feed
    await cleanup()
    let response = await request.authenticated.get('posts')
    let data = await response.json()
    assert.equal(data.length, 0)
  })

  it('deletes post images from disk', async () => {
    let image = await createTestImage()
    let created = await request.authenticated.uploadImage('posts', image, 'photo.png')
    let post = await created.json()
    let imagePath = post.images[0].imagePath

    await request.authenticated.delete('users/me')

    // need a new user to check the image
    await cleanup()
    let response = await request.authenticated.get('uploads/' + imagePath)
    assert.equal(response.status, 404)
  })

  it('deletes avatar from disk', async () => {
    let image = await createTestImage()
    let uploaded = await request.authenticated.uploadImage('users/me/avatar', image, 'avatar.png')
    let data = await uploaded.json()
    let avatarPath = data.avatarPath

    await request.authenticated.delete('users/me')

    await cleanup()
    let response = await request.authenticated.get('uploads/' + avatarPath)
    assert.equal(response.status, 404)
  })

  it('returns 401 without a token', async () => {
    let response = await request.delete('users/me')
    assert.equal(response.status, 401)
  })
})
