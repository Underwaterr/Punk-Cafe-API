import { createInterface } from 'node:readline'
import { PrismaClient } from './generated/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'
import argon2 from 'argon2'
import generateCode from '../server/generate-code.ts'
import { loadEnvFile } from 'node:process'
try { loadEnvFile() } catch {}

let username = process.argv[2]
let email = process.argv[3]

if (!username || !email) {
  console.error('Usage: npm run db:seed -- <username> <email>')
  process.exit(1)
}

let password = await new Promise<string>((resolve) => {
  let rl = createInterface({ input: process.stdin, output: process.stdout })
  rl.question('Admin password: ', answer=> {
    rl.close()
    resolve(answer)
  })
})

if (!password) {
  console.error('Password is required')
  process.exit(1)
}

let adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
let prisma = new PrismaClient({ adapter })

let passwordHash = await argon2.hash(password)
let code = generateCode()

let user = await prisma.user.create({
  data: {
    username,
    email,
    role: 'admin',
    authentication: { create: { passwordHash } },
  },
})

let invitation = await prisma.invitation.create({
  data: {
    code,
    invitedBy: user.id,
  },
})

console.log(`Admin created: ${user.username} (${email})`)
console.log(`First invite code: ${invitation.code}`)

await prisma.$disconnect()
