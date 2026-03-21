import { Router } from 'express'
import controller from './controller.ts'

let router = Router()
router.get('/:directory/:filename', controller.get)

export default router
