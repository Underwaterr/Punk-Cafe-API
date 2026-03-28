import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestImage, createTestUser } from '#test'
import prisma from '#prisma'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('GET /users', ()=> {

  it('returns all users', async ()=> {
    // Arrange
    let user = { data: { realName: 'Odie', email: 'odie@example.com' } }
    await prisma.user.create(user)
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('users')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.length, 2)
    assert.equal(data[1].realName, 'Odie')
  })

  it('does not expose email', async ()=> {
    // Arrange
    let user = { data: { realName: 'Odie', email: 'odie@example.com' } }
    await prisma.user.create(user)
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('users')
    let data = await response.json()

    // Assert
    assert.equal(data[0].email, undefined)
  })

  it('returns 401 without a token', async ()=> {
    // Arrange
    let user = { data: { realName: 'Odie', email: 'odie@example.com' } }
    await prisma.user.create(user)
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.get('users')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 401)
  })
})

describe('GET /users/me', ()=> {
  it('returns the authenticated user', async ()=> {
    // Arrange
    let { token } = await createTestUser('Garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('users/me')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.realName, 'Garfield')
    assert.equal(data.email, 'garf@example.com')
  })

  it('returns 401 without a token', async ()=> {
    // Act
    let response = await request.get('users/me')

    // Assert
    assert.equal(response.status, 401)
  })
})

describe('GET /users/:id', ()=> {
  it('returns a user by id', async ()=> {
    // Arrange
    let user = { data: { realName: 'Odie', email: 'odie@example.com' } }
    let created = await prisma.user.create(user)
    let { token } = await createTestUser('Garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('users/' + created.id)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.realName, 'Odie')
    assert.equal(data.id, created.id)
  })

  it('returns 400 for an invalid UUID', async ()=> {
    // Arrange
    let { token } = await createTestUser('Garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('users/not-a-uuid')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid user ID')
  })

  it('returns 400 for a numeric ID', async ()=> {
    // Arrange
    let { token } = await createTestUser('Garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('users/123')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid user ID')
  })

  it('returns 404 for nonexistent user', async ()=> {
    // Arrange
    let { token } = await createTestUser('Garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('users/00000000-0000-0000-0000-000000000000')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 404)
    assert.equal(data.error, 'User not found')
  })

  it('returns 401 without a token', async ()=> {
    // Arrange
    let user = { data: { realName: 'Odie', email: 'odie@example.com' } }
    let created = await prisma.user.create(user)
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.get('users/' + created.id)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 401)
  })
})

describe('POST /users/me/avatar', ()=> {
  it('uploads an avatar', async ()=> {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).uploadImage('users/me/avatar', image, 'avatar.png')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.ok(data.avatarPath)
    assert.match(data.avatarPath, /^avatars\/[\w]+\.webp$/)
  })

  it('returns 400 without an image', async ()=> {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).post('users/me/avatar')

    // Assert
    assert.equal(response.status, 400)
  })

  it('returns 400 for an invalid image', async ()=> {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let garbage = Buffer.from('not a real image')

    // Act
    let response = await request.withToken(token).uploadImage('users/me/avatar', garbage, 'avatar.png')

    // Assert
    assert.equal(response.status, 400)
  })

  it('serves the uploaded avatar', async ()=> {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let uploadResponse = await request.withToken(token).uploadImage('users/me/avatar', image, 'avatar.png')
    let data = await uploadResponse.json()

    // Act
    let response = await request.withToken(token).get('images/' + data.avatarPath)

    // Assert
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/webp')
  })

  it('returns 401 without a token', async () => {
    // Act
    let response = await request.get('users/me/avatar')

    // Assert
    assert.equal(response.status, 401)
  })
})

describe('PUT /users/me', ()=> {
  it('updates real name', async ()=> {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).put('users/me', { realName: 'Garfield the Cat' })
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.realName, 'Garfield the Cat')
  })

  it('updates pronouns', async ()=> {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).put('users/me', { pronouns: 'he/him' })
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.pronouns, 'he/him')
  })

  it('updates bio', async ()=> {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).put('users/me', { bio: "I have no idea what's going on" })
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.bio, "I have no idea what's going on")
  })

  it('updates multiple fields at once', async ()=> {
    // Arrange
    let { token } = await createTestUser('Garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).put('users/me', {
      realName: 'Garfield the Cat',
      pronouns: 'he/him',
      bio: "I have no idea what's going on",
    })
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.realName, 'Garfield the Cat')
    assert.equal(data.pronouns, 'he/him')
    assert.equal(data.bio, "I have no idea what's going on")
  })

  it('returns 400 for invalid input', async ()=> {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).put('users/me', { bio: 'x'.repeat(301), })

    // Assert
    assert.equal(response.status, 400)
  })

  it('returns 401 without a token', async ()=> {
    // Act
    let response = await request.put('users/me', { realName: 'test' })

    // Assert
    assert.equal(response.status, 401)
  })
})

describe('DELETE /users/me', ()=> {
  it('deletes the authenticated user', async ()=> {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).delete('users/me')

    // Assert
    assert.equal(response.status, 200)
  })

  it('invalidates the session after deletion', async ()=> {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')
    await request.withToken(token).delete('users/me')

    // Act
    let response = await request.withToken(token).get('users/me')

    // Assert
    assert.equal(response.status, 401)
  })

  it("deletes the user's posts", async ()=> {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')
    await request.withToken(token).uploadImage('posts', image, 'photo.png')
    await request.withToken(token).delete('users/me')
    let token2 = (await createTestUser('zombie-garfield', 'garf-zomb@example.com')).token

    // Act
    let response = await request.withToken(token2).get('posts')
    let { posts } = await response.json()

    // Assert
    assert.equal(posts.length, 0)
  })

  it('deletes post images from disk', async ()=> {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let created = await request.withToken(token).uploadImage('posts', image, 'photo.png')
    let post = await created.json()
    let imagePath = post.images[0].imagePath
    await request.withToken(token).delete('users/me')
    let token2 = (await createTestUser('zombie-garfield', 'garf-zomb@example.com')).token

    // Act
    let response = await request.withToken(token2).get('uploads/' + imagePath)

    // Assert
    assert.equal(response.status, 404)
  })

  it('deletes avatar from disk', async ()=> {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let uploaded = await request.withToken(token).uploadImage('users/me/avatar', image, 'avatar.png')
    let data = await uploaded.json()
    let avatarPath = data.avatarPath
    let token2 = (await createTestUser('zombie-garfield', 'garf-zomb@example.com')).token
    await request.withToken(token2).delete('users/me')

    // Act
    let response = await request.withToken(token).get('uploads/' + avatarPath)

    // Assert
    assert.equal(response.status, 404)
  })

  it('returns 401 without a token', async ()=> {
    // Act
    let response = await request.delete('users/me')

    // Assert
    assert.equal(response.status, 401)
  })
})
