import { Router } from 'express'
import authenticationRouter from './authentication/router.ts'

let router = Router()
router.use('/authentication', authenticationRouter)

export default router
