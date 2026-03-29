import { Router } from 'express'
import controller from './controller.ts'

let router = Router()

router.post('/', controller.create)
router.delete('/:id', controller.remove)
router.get('/mine', controller.mine)

export default router
