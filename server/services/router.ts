import { Router } from 'express'
import authenticationRouter from './authentication/router.ts'
import { authenticationLimit } from '#server/middleware/rate-limiter.ts'

let router = Router()
router.use('/authentication', authenticationLimit, authenticationRouter)

export default router
