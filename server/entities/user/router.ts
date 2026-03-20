import { Router } from 'express'
import controller from './controller.ts'

let router = Router()

router.get('/', controller.getAll)
router.get('/:id', controller.getById)

export default router
