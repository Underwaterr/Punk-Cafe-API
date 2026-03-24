import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer, stopServer, cleanup, createTestUser } from '#test'
import prisma from '#prisma'
import request from '#request'

before(startServer)
beforeEach(cleanup)
after(stopServer)

async function createInvitation(userId: string) {
  return await prisma.invitation.create({
    data: {
      code: 'test-invite-code',
      invitedBy: userId,
    },
  })
}

describe('POST /authentication/register', () => {
  let invited = {
    username: 'nermal',
    email: 'cutie@example.com',
    password: '12345678yeah',
    code: 'test-invite-code'
  }

  it('creates a user and returns a session token', async () => {
    // Arrange
    let inviter = await createTestUser('arlene', 'arlene@example.com')
    await createInvitation(inviter.user.id)

    // Act
    let response = await request.post('authentication/register', invited)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 201)
    assert.ok(data.session.token)
    assert.ok(data.session.expiresAt)
    assert.equal(data.user.username, 'nermal')
  })

  it('redeems the invitation', async () => {
    // Arrange
    let inviter = await createTestUser('arlene', 'arlene@example.com')
    await createInvitation(inviter.user.id)

    // Act
    await request.post('authentication/register', invited)

    // Assert
    let invitation = await prisma.invitation.findUnique({
      where: { code: 'test-invite-code' }
    })
    // TODO: check the values
    assert.ok(invitation?.redeemedBy)
    assert.ok(invitation?.redeemedAt)
  })

  it('returns 400 for invalid username', async () => {
    // Arrange
    let badUser = { ...invited, username: '' }

    // Act
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for invalid password', async () => {
    // Arrange
    let badUser = { ...invited, password: 'short' }

    // Act
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for invalid email', async () => {
    // Arrange
    let badUser = { ...invited, email: 'invalid-email' }

    // Act
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid input')
  })

  it('returns 400 for an invalid invite code', async () => {
    // Arrange
    let badUser = { ...invited, code: 'invalid-code' }

    // Act
    let response = await request.post('authentication/register', badUser)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invalid invite code')
  })

  it('returns 400 for an already redeemed invite code', async () => {
    // Arrange
    let inviter = await createTestUser('arlene', 'arlene@example.com')
    let invitation = await createInvitation(inviter.user.id)
    await prisma.invitation.update({
      where: { code: invitation.code },
      data: {
        redeemedBy: invitation.invitedBy,
        redeemedAt: new Date(),
      },
    })

    // Act
    let response = await request.post('authentication/register', invited)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 400)
    assert.equal(data.error, 'Invite code already used')
  })

  it('returns 409 for a duplicate username', async () => {
    // Arrange
    let inviter = await createTestUser('arlene', 'arlene@example.com')
    await createInvitation(inviter.user.id)
    await createTestUser(invited.username, 'unique@example.com')

    // Act
    let response = await request.post('authentication/register', invited)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 409)
    assert.equal(data.error, 'Username already taken')
  })

  it('returns 409 for a duplicate email', async () => {
    // Arrange
    let inviter = await createTestUser('arlene', 'arlene@example.com')
    await createInvitation(inviter.user.id)
    await createTestUser('unique', invited.email)

    // Act
    let response = await request.post('authentication/register', invited)
    let data = await response.json()

    // Assert
    assert.equal(response.status, 409)
    assert.equal(data.error, 'Email already taken')
  })
})
