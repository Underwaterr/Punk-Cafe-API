import './env.ts'
import httpServer from './server/index.ts'

httpServer.listen(process.env.PORT)
