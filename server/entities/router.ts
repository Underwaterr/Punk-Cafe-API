import { Router } from 'express'
import userRouter from './user/router.ts'
import invitationRouter from './invitation/router.ts'
import postRouter from './post/router.ts'
import imageRouter from './image/router.ts'

let router = Router()
router.use('/users', userRouter)
router.use('/invitations', invitationRouter)
router.use('/posts', postRouter)
router.use('/images', imageRouter)

export default router
