import { randomBytes, createHash } from 'node:crypto'

export function generateToken() {
  return randomBytes(32).toString('hex')
}

export function hashToken(token:string) {
  return createHash('sha256').update(token).digest('hex')
}
