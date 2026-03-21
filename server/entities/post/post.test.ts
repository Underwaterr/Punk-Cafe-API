import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { startServer, stopServer, resetDatabase, request } from '#test'

before(startServer)
beforeEach(resetDatabase)
after(stopServer)

async function createTestImage() {
  let redSquare = { width:800, height:800, channels:3, background:'red' } as const
  return await sharp({ create: redSquare }).png().toBuffer()
}

describe('POST /posts', () => {
  it('creates a post with an image', async () => {
    let image = await createTestImage()
    let response = await request.authenticated.uploadImage('posts', image, 'photo.png', 'hello world')
    let data = await response.json()
    assert.equal(response.status, 201)
    assert.equal(data.caption, 'hello world')
    assert.ok(data.images.length > 0)
    assert.ok(data.images[0].imagePath)
    assert.ok(data.images[0].thumbnailPath)
  })
})
