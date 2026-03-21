import { Router } from 'express'
import controller from './controller.ts'

let router = Router()

router.post('/', controller.create)
router.get('/mine', controller.mine)

export default router
