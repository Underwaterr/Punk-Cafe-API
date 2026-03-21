import { Router } from 'express'
import controller from './controller.ts'

let router = Router()

router.post('/:postId', controller.create)
router.delete('/:postId', controller.remove)

export default router
