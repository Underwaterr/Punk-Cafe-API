import { Router } from 'express'
import userRouter from './user/router.ts'
import invitationRouter from './invitation/router.ts'

let router = Router()
router.use('/users', userRouter)
router.use('/invitations', invitationRouter)

export default router
