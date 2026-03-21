import { Router } from 'express'
import controller from './controller.ts'
import upload from '../../image-upload.ts'

let router = Router()

router.get('/', controller.getAll)
router.post('/me/avatar', upload.single('image'), controller.updateAvatar)
router.get('/me', controller.getMe)
router.delete('/me', controller.removeMe)
router.get('/:id', controller.getById)

export default router
