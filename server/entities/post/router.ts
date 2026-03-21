import { Router } from 'express'
import controller from './controller.ts'
import upload from '../../services/image/upload.ts'

let router = Router()

// upload.single is the Multer middleware
// for parsing the body into an image
router.post('/', upload.single('image'), controller.create)

router.get('/', controller.getAll)
router.get('/:id', controller.getById)

export default router
