import { Router } from 'express'
import controller from './controller.ts'
import guard from '../../guard.ts'

let router = Router()

router.post('/register', controller.register)
router.post('/login', controller.login)
router.post('/logout', controller.logout)
router.put('/password', guard, controller.changePassword)

export default router
