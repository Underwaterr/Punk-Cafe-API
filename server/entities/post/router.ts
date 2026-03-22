import { Router } from 'express'
import controller from './controller.ts'
import upload from '#upload-image'

let router = Router()

router.post('/', upload.single('image'), controller.create)
router.get('/', controller.getFeed)
router.get('/:id', controller.getById)
router.delete('/:id', controller.remove)

export default router
