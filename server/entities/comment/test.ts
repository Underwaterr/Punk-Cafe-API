import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser, createPost } from '#test'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

describe('POST /comments', ()=> {
  it('creates a comment', async ()=> {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)
    let response = await request.withToken(token).post('comments', {
      postId: post.id,
      body: "Low-key bussin', no cap",
    })
    let data = await response.json()
    assert.equal(response.status, 201)
    assert.equal(data.body, "Low-key bussin', no cap")
    assert.equal(data.author.username, 'jon')
  })

  it('increments the comment count on the post', async ()=> {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)
    await request.withToken(token).post('comments', {
      postId: post.id,
      body: "Low-key bussin', no cap",
    })
    let response = await request.withToken(token).get(`posts/${post.id}`)
    let data = await response.json()
    assert.equal(data._count.comments, 1)
  })

  it('returns 400 for empty body', async ()=> {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)
    let response = await request.withToken(token).post('comments', {
      postId: post.id,
      body: '',
    })
    assert.equal(response.status, 400)
  })

  it('returns 400 for missing postId', async ()=> {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let response = await request.withToken(token).post('comments', {
      body: "Low-key bussin', no cap",
    })
    assert.equal(response.status, 400)
  })

  it('returns 404 for a nonexistent post', async ()=> {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let fakeId = '00000000-0000-0000-0000-000000000000'
    let response = await request.withToken(token).post('comments', {
      postId: fakeId,
      body: 'hello',
    })
    assert.equal(response.status, 404)
  })
})

describe('GET /comments/post/:id', ()=> {
  it('returns comments in chronological order', async ()=> {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    await request.withToken(token).post('comments', { postId: post.id, body: 'first' })
    await request.withToken(token).post('comments', { postId: post.id, body: 'second' })

    let response = await request.withToken(token).get(`comments/post/${post.id}`)
    let data = await response.json()

    assert.equal(data.length, 2)
    assert.equal(data[0].body, 'first')
    assert.equal(data[1].body, 'second')
  })

  it('returns empty array for post with no comments', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    let response = await request.withToken(token).get(`comments/post/${post.id}`)
    let data = await response.json()

    assert.equal(data.length, 0)
  })
})

describe('PUT /comments/:id', () => {
  it('updates a comment', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    let created = await request.withToken(token).post('comments', {
      postId: post.id,
      body: 'original',
    })
    let comment = await created.json()

    let response = await request.withToken(token).put(`comments/${comment.id}`, {
      body: 'edited',
    })
    let data = await response.json()

    assert.equal(response.status, 200)
    assert.equal(data.body, 'edited')
  })

  it('returns 403 when editing someone elses comment', async () => {
    let jon = await createTestUser('arbuckle', 'alice@example.com')
    let lyman = await createTestUser('lyman', 'lyman@example.com')
    let post = await createPost(jon.token)

    let created = await request.withToken(jon.token).post('comments', {
      postId: post.id,
      body: 'jon said this',
    })
    let comment = await created.json()

    let response = await request.withToken(lyman.token).put(`comments/${comment.id}`, {
      body: 'lyman tries to edit',
    })
    assert.equal(response.status, 403)
  })

  it('returns 400 for empty body', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    let created = await request.withToken(token).post('comments', {
      postId: post.id,
      body: 'original',
    })
    let comment = await created.json()

    let response = await request.withToken(token).put(`comments/${comment.id}`, {
      body: '',
    })
    assert.equal(response.status, 400)
  })
})

describe('DELETE /comments/:id', () => {
  it('deletes own comment', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let post = await createPost(token)

    let created = await request.withToken(token).post('comments', {
      postId: post.id,
      body: 'to be deleted',
    })
    let comment = await created.json()

    let response = await request.withToken(token).delete(`comments/${comment.id}`)
    assert.equal(response.status, 200)

    let comments = await request.withToken(token).get(`comments/post/${post.id}`)
    let data = await comments.json()
    assert.equal(data.length, 0)
  })

  it('returns 403 when deleting someone elses comment', async () => {
    let jon = await createTestUser('arbuckle', 'alice@example.com')
    let lyman = await createTestUser('lyman', 'lyman@example.com')
    let post = await createPost(jon.token)

    let created = await request.withToken(jon.token).post('comments', {
      postId: post.id,
      body: 'jon said this',
    })
    let comment = await created.json()

    let response = await request.withToken(lyman.token).delete(`comments/${comment.id}`)
    assert.equal(response.status, 403)
  })

  it('allows admin to delete any comment', async () => {
    let jon = await createTestUser('arbuckle', 'alice@example.com')
    let lyman = await createTestUser('lyman', 'lyman@example.com')
    let prisma = (await import('#prisma')).default
    await prisma.user.update({
      where: { username: 'lyman' },
      data: { role: 'admin' },
    })
    let post = await createPost(jon.token)
    let created = await request.withToken(jon.token).post('comments', {
      postId: post.id,
      body: 'on god, jon said this',
    })
    let comment = await created.json()
    let response = await request.withToken(lyman.token).delete(`comments/${comment.id}`)
    assert.equal(response.status, 200)
  })

  it('returns 404 for nonexistent comment', async () => {
    let { token } = await createTestUser('jon', 'arbuckle@example.com')
    let response = await request.withToken(token).delete('comments/00000000-0000-0000-0000-000000000000')
    assert.equal(response.status, 404)
  })
})
