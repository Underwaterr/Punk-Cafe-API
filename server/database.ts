import { PrismaClient } from '#prisma-client'
import { PrismaPg } from '@prisma/adapter-pg'

let adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export default new PrismaClient({ adapter })
