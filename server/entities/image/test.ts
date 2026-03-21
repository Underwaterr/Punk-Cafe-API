import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, request, createTestImage } from '#test'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('GET /uploads/:directory/:filename', () => {
  it('serves an uploaded image', async () => {
    let image = await createTestImage()
    let uploadResponse = await request.authenticated.uploadImage('posts', image, 'photo.png')
    let post = await uploadResponse.json()

    let imagePath = post.images[0].imagePath
    let response = await request.authenticated.get('images/' + imagePath)

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/webp')
  })

  it('returns 404 for nonexistent image', async () => {
    let response = await request.authenticated.get('images/posts/nonexistent.webp')
    assert.equal(response.status, 404)
  })

  it('returns 400 for invalid directory', async () => {
    let response = await request.authenticated.get('images/invalid/file.webp')
    assert.equal(response.status, 400)
  })

  it('returns 401 without a token', async () => {
    let response = await request.get('images/posts/anything.webp')
    assert.equal(response.status, 401)
  })
})
