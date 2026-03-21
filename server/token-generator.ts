import { randomBytes } from 'node:crypto'

export default function generateToken() {
  return randomBytes(32).toString('hex')
}
