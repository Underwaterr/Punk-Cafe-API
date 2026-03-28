import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestImage, createTestUser } from '#test'
import request from '#request'
import prisma from '#prisma'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('POST /posts', () => {
  it('creates a post with an image', async () => {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).uploadImage('posts', image, 'photo.png', 'hello world')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 201)
    assert.equal(data.caption, 'hello world')
    assert.ok(data.images.length > 0)
    assert.ok(data.images[0].imagePath)
    assert.ok(data.images[0].thumbnailPath)
  })

  it('creates a post without a caption', async () => {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).uploadImage('posts', image, 'photo.png')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 201)
    assert.equal(data.caption, null)
  })

  it('includes the author in the response', async () => {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).uploadImage('posts', image, 'photo.png')
    let data = await response.json()

    // Assert
    assert.equal(data.author.realName, 'garfield')
  })

  it('returns 400 without an image', async () => {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).post('posts')

    // Assert
    assert.equal(response.status, 400)
  })

  it('returns 400 for an invalid image', async () => {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let garbage = Buffer.from('not a real image')

    // Act
    let response = await request.withToken(token).uploadImage('posts', garbage, 'photo.png')

    // Assert
    assert.equal(response.status, 400)
  })

  it('returns 401 without a token', async ()=> {
    // Arrange
    let image = await createTestImage()
    let form = new FormData()
    form.append('image', new Blob([new Uint8Array(image)]), 'photo.png')

    // Act
    let response = await request.postFormData('posts', form)

    // Assert
    assert.equal(response.status, 401)
  })
})

describe('GET /posts', () => {
  it('returns posts in reverse chronological order', async () => {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')
    await request.withToken(token).uploadImage('posts', image, 'first.png', 'first')
    await request.withToken(token).uploadImage('posts', image, 'second.png', 'second')

    // Act
    let response = await request.withToken(token).get('posts')
    let { posts } = await response.json()

    // Assert
    assert.equal(posts.length, 2)
    assert.equal(posts[0].caption, 'second')
    assert.equal(posts[1].caption, 'first')
  })

  it('returns 401 without a token', async () => {
    // Act
    let response = await request.get('posts')

    // Assert
    assert.equal(response.status, 401)
  })

  it('returns nextCursor when more posts exist', async () => {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let image = await createTestImage()

    for (let i = 0; i < 21; i++) {
      await request.withToken(token).uploadImage('posts', image, `photo-${i}.png`, `post ${i}`)
    }

    // Act
    let response = await request.withToken(token).get('posts')
    let data = await response.json()

    // Assert
    assert.equal(data.posts.length, 20)
    assert.ok(data.nextCursor)
  })

  it('returns null nextCursor when no more posts', async () => {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let image = await createTestImage()
    await request.withToken(token).uploadImage('posts', image, 'photo.png', 'hello')

    // Act
    let response = await request.withToken(token).get('posts')
    let data = await response.json()

    // Assert
    assert.equal(data.posts.length, 1)
    assert.equal(data.nextCursor, null)
  })

  it('paginates with cursor', async () => {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let image = await createTestImage()

    for (let i = 0; i < 5; i++) {
      await request.withToken(token).uploadImage('posts', image, `photo-${i}.png`, `post ${i}`)
    }

    // Act
    let first = await request.withToken(token).get('posts?take=3')
    let firstData = await first.json()
    let second = await request.withToken(token).get(`posts?take=3&cursor=${firstData.nextCursor}`)
    let secondData = await second.json()

    // Assert
    assert.equal(firstData.posts.length, 3)
    assert.equal(secondData.posts.length, 2)
    assert.equal(secondData.nextCursor, null)
  })

  it('includes likedByMe', async () => {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let image = await createTestImage()
    let created = await request.withToken(token).uploadImage('posts', image, 'photo.png')
    let post = await created.json()
    await request.withToken(token).post(`likes/${post.id}`)

    // Act
    let response = await request.withToken(token).get('posts')
    let data = await response.json()

    // Assert
    assert.equal(data.posts[0].likedByMe, true)
  })
})

describe('GET /posts/:id', () => {
  it('returns a post by id', async () => {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let created = await request.withToken(token).uploadImage('posts', image, 'photo.png', 'test')
    let createdData = await created.json()

    // Act
    let response = await request.withToken(token).get('posts/' + createdData.id)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.caption, 'test')
    assert.ok(data.images.length > 0)
    assert.ok(data.author.realName)
  })

  it('returns 404 for nonexistent post', async () => {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('posts/00000000-0000-0000-0000-000000000000')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 404)
    assert.equal(data.error, 'Post not found')
  })

  it('returns 400 for invalid post ID', async () => {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('posts/not-a-uuid')
    let data = await response.json()

    // Assert
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid post ID')
  })
})

describe('PUT /posts/:id', ()=> {
  it('updates the caption', async ()=> {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let created = await request.withToken(token).uploadImage('posts', image, 'photo.png', 'before')
    let post = await created.json()

    // Act
    let response = await request.withToken(token).put('posts/' + post.id, { caption: 'after' })
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.caption, 'after')
  })

  it('sets caption to null', async ()=> {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let created = await request.withToken(token).uploadImage('posts', image, 'photo.png', 'hello')
    let post = await created.json()

    // Act
    let response = await request.withToken(token).put('posts/' + post.id, { caption: null })
    let data = await response.json()

    // Assert
    assert.equal(response.status, 200)
    assert.equal(data.caption, null)
  })

  it('returns 404 for nonexistent post', async ()=> {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).put('posts/00000000-0000-0000-0000-000000000000', { caption: 'hello' })

    // Assert
    assert.equal(response.status, 404)
  })

  it('returns 400 for invalid post ID', async ()=> {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).put('posts/not-a-uuid', { caption: 'hello' })

    // Assert
    assert.equal(response.status, 400)
  })

  it('returns 403 if not the author', async ()=> {
    // Arrange
    let garfield = await createTestUser('garfield', 'garf@example.com')
    let nermal = await createTestUser('nermal', 'cutie@example.com')
    let image = await createTestImage()
    let created = await request.withToken(garfield.token).uploadImage('posts', image, 'photo.png', 'mine')
    let post = await created.json()

    // Act
    let response = await request.withToken(nermal.token).put('posts/' + post.id, { caption: 'hijacked' })

    // Assert
    assert.equal(response.status, 403)
  })

  it("returns 403 for admin editing another user's post", async ()=> {
    // Arrange
    let arlene = await createTestUser('arlene', 'arlene@example.com')
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let nermal = await createTestUser('nermal', 'cutie@example.com')
    let image = await createTestImage()
    let created = await request.withToken(nermal.token).uploadImage('posts', image, 'photo.png', 'original')
    let post = await created.json()

    // Act
    let response = await request.withToken(arlene.token).put('posts/' + post.id, { caption: 'edited' })

    // Assert
    assert.equal(response.status, 403)
  })
})

describe('DELETE /posts/:id', () => {
  it('deletes a post', async () => {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let created = await request.withToken(token).uploadImage('posts', image, 'photo.png')
    let post = await created.json()

    // Act
    let response = await request.withToken(token).delete('posts/' + post.id)

    // Assert
    assert.equal(response.status, 200)
    let fetched = await request.withToken(token).get('posts/' + post.id)
    assert.equal(fetched.status, 404)
  })

  it('deletes the image files from disk', async () => {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('garfield', 'garf@example.com')
    let created = await request.withToken(token).uploadImage('posts', image, 'photo.png')
    let post = await created.json()
    let imagePath = post.images[0].imagePath
    let thumbnailPath = post.images[0].thumbnailPath

    // Act
    await request.withToken(token).delete('posts/' + post.id)

    // Assert
    let imageResponse = await request.withToken(token).get('uploads/' + imagePath)
    let thumbnailResponse = await request.withToken(token).get('uploads/' + thumbnailPath)
    assert.equal(imageResponse.status, 404)
    assert.equal(thumbnailResponse.status, 404)
  })

  it('returns 404 for nonexistent post', async () => {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).delete('posts/00000000-0000-0000-0000-000000000000')

    // Assert
    assert.equal(response.status, 404)
  })

  it('returns 400 for invalid post ID', async () => {
    // Arrange
    let { token } = await createTestUser('garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).delete('posts/not-a-uuid')

    // Assert
    assert.equal(response.status, 400)
  })

  it('returns 401 without a token', async () => {
    // Act
    let response = await request.delete('posts/some-id')

    // Assert
    assert.equal(response.status, 401)
  })

  it('allows admin to delete any post', async () => {
    // Arrange
    let arlene = await createTestUser('arlene', 'arlene@example.com')
    await prisma.user.update({ where: { id: arlene.user.id }, data: { role: 'admin' } })
    let nermal = await createTestUser('nermal', 'cutie@example.com')
    let image = await createTestImage()
    let created = await request.withToken(nermal.token).uploadImage('posts', image, 'photo.png')
    let post = await created.json()

    // Act
    let response = await request.withToken(arlene.token).delete('posts/' + post.id)

    // Assert
    assert.equal(response.status, 200)
  })
})
