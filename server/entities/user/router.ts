import { Router } from 'express'
import controller from './controller.ts'
import upload from '../../image-upload.ts'

let router = Router()

router.get('/me', controller.getMe)
router.post('/me/avatar', upload.single('image'), controller.updateAvatar)
router.put('/me', controller.updateProfile)
router.delete('/me', controller.removeMe)

router.get('/', controller.getAll)
router.get('/:id', controller.getById)

export default router
