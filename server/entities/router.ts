import { Router } from 'express'
import userRouter from './user/router.ts'

let router = Router()
router.use('/users', userRouter)

export default router
