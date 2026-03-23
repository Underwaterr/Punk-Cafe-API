import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestImage, createTestUser } from '#test'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('GET /uploads/:directory/:filename', ()=> {

  it('serves an uploaded image', async ()=> {
    // Arrange
    let image = await createTestImage()
    let { token } = await createTestUser('Garfield', 'garf@example.com')
    let uploadResponse = await request.withToken(token).uploadImage('posts', image, 'photo.png')
    let post = await uploadResponse.json()
    let imagePath = post.images[0].imagePath

    // Act
    let response = await request.withToken(token).get('images/' + imagePath)

    // Assert
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/webp')
  })

  it('returns 404 for nonexistent image', async ()=> {
    // Arrange
    let { token } = await createTestUser('Garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('images/posts/nonexistent.webp')

    // Assert
    assert.equal(response.status, 404)
  })

  it('returns 400 for invalid directory', async ()=> {
    // Arrange
    let { token } = await createTestUser('Garfield', 'garf@example.com')

    // Act
    let response = await request.withToken(token).get('images/invalid/file.webp')

    // Assert
    assert.equal(response.status, 400)
  })

  it('returns 401 without a token', async ()=> {
    // Act
    let response = await request.get('images/posts/anything.webp')

    // Assert
    assert.equal(response.status, 401)
  })
})
