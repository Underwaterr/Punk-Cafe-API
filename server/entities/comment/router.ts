import { Router } from 'express'
import controller from './controller.ts'

let router = Router()

router.post('/', controller.create)
router.get('/post/:id', controller.getByPostId)
router.get('/:id', controller.getById)
router.put('/:id', controller.update)
router.delete('/:id', controller.remove)

export default router
