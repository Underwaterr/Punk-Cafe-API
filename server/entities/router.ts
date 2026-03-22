import { Router } from 'express'
import commentRouter from './comment/router.ts'
import imageRouter from './image/router.ts'
import invitationRouter from './invitation/router.ts'
import likeRouter from './like/router.ts'
import postRouter from './post/router.ts'
import sessionRouter from './session/router.ts'
import userRouter from './user/router.ts'


let router = Router()
router.use('/comments',     commentRouter)
router.use('/images',       imageRouter)
router.use('/invitations',  invitationRouter)
router.use('/likes',        likeRouter)
router.use('/posts',        postRouter)
router.use('/sessions',     sessionRouter)
router.use('/users',        userRouter)

export default router
