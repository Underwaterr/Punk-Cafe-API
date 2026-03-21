import { Router } from 'express'
import imageRouter from './image/router.ts'
import invitationRouter from './invitation/router.ts'
import likeRouter from './like/router.ts'
import postRouter from './post/router.ts'
import userRouter from './user/router.ts'
import commentRouter from './comment/router.ts'

let router = Router()
router.use('/images', imageRouter)
router.use('/invitations', invitationRouter)
router.use('/likes', likeRouter)
router.use('/posts', postRouter)
router.use('/users', userRouter)
router.use('/comments', commentRouter)

export default router
