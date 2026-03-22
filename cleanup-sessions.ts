import './env.ts'
import prisma from '#prisma'
import logger from '#logger'

let result = await prisma.session.deleteMany({
  where: { expiresAt: { lt: new Date() } }
})

logger.info(`Deleted ${result.count} expired sessions`)

await prisma.$disconnect()
