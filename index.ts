import { promisify } from 'node:util'
import './env.ts'
import httpServer from './server/index.ts'
import prisma from '#prisma'
import { logger } from './server/middleware/logger.ts'

httpServer.listen(process.env.PORT)

let closeServer = promisify(httpServer.close.bind(httpServer))
let shutdown = async function() {
  await closeServer()
  await prisma.$disconnect()
  console.log("\nGoodbye!")
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
