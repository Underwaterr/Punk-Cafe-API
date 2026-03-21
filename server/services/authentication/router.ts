import { Router } from 'express'
import controller from './controller.ts'

let router = Router()

router.post('/register', controller.register)
router.post('/login', controller.login)

router.post('/logout', controller.logout)

export default router
