import { createInterface } from 'node:readline'
import { PrismaClient } from './generated/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'
import argon2 from 'argon2'
import generateCode from '../utilities/generate-code.ts'
import { loadEnvFile } from 'node:process'
try { loadEnvFile() } catch {}

let email = await new Promise<string>(resolve=> {
  let rl = createInterface({ input: process.stdin, output: process.stdout })
  rl.question('What is your email? ', answer=> {
    rl.close()
    resolve(answer)
  })
})

if (!email) {
  console.error('Email is required')
  process.exit(1)
}


let realName = await new Promise<string>(resolve=> {
  let rl = createInterface({ input: process.stdin, output: process.stdout })
  rl.question('What is your name? ', answer=> {
    rl.close()
    resolve(answer)
  })
})

if (!realName) {
  console.error('Name is required')
  process.exit(1)
}

let password = await new Promise<string>(resolve=> {
  let rl = createInterface({ input: process.stdin, output: process.stdout })
  rl.question('Enter password: ', answer=> {
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
    realName,
    email,
    role: 'admin',
    authentication: { create: { passwordHash } },
  },
})

let invitation = await prisma.invitation.create({
  data: {
    realName,
    code,
    invitedBy: user.id,
  },
})

console.log(`Admin created: ${user.realName} (${email})`)
console.log(`First invite code: ${invitation.code}`)

await prisma.$disconnect()
