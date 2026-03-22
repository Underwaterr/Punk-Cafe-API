import { Router } from 'express'
import controller from './controller.ts'

let router = Router()
router.get('/', controller.getByUserId)
router.delete('/:id', controller.remove)

export default router
