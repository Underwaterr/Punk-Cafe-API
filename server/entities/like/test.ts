import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser, createTestImage } from '#test'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

async function createPost(token: string) {
  let image = await createTestImage()
  let response = await request.withToken(token).uploadImage('posts', image, 'photo.png')
  return await response.json()
}

describe('POST /likes/:postId', () => {
  it('likes a post', async () => {
    // Arrange
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    // Act
    let response = await request.withToken(token).post(`likes/${post.id}`)
    
    // Assert
    assert.equal(response.status, 201)
  })

  it('increments the like count', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    await request.withToken(token).post(`likes/${post.id}`)

    let response = await request.withToken(token).get(`posts/${post.id}`)
    let data = await response.json()
    assert.equal(data._count.likes, 1)
    assert.equal(data.likedByMe, true)
  })

  it('returns 409 when liking twice', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    await request.withToken(token).post(`likes/${post.id}`)
    let response = await request.withToken(token).post(`likes/${post.id}`)
    assert.equal(response.status, 409)
  })

  it('returns 400 for invalid post ID', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let response = await request.withToken(token).post('likes/not-a-uuid')
    assert.equal(response.status, 400)
  })

  it('returns 401 without a token', async ()=> {
    // Arrange
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    // Act
    let response = await request.post(`likes/${post.id}`)
    
    // Assert
    assert.equal(response.status, 401)
  })
})

describe('DELETE /likes/:postId', () => {
  it('unlikes a post', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    await request.withToken(token).post(`likes/${post.id}`)
    let response = await request.withToken(token).delete(`likes/${post.id}`)
    assert.equal(response.status, 200)
  })

  it('decrements the like count', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    await request.withToken(token).post(`likes/${post.id}`)
    await request.withToken(token).delete(`likes/${post.id}`)

    let response = await request.withToken(token).get(`posts/${post.id}`)
    let data = await response.json()
    assert.equal(data._count.likes, 0)
    assert.equal(data.likedByMe, false)
  })

  it('returns 404 when unliking a post not liked', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    let response = await request.withToken(token).delete(`likes/${post.id}`)
    assert.equal(response.status, 404)
  })

  it('returns 401 without a token', async ()=> {
    // Arrange
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)
    await request.withToken(token).post(`likes/${post.id}`)

    // Act
    let response = await request.delete(`likes/${post.id}`)

    // Assert
    assert.equal(response.status, 401)
  })
})
