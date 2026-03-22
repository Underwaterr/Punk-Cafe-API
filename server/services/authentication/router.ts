import { Router } from 'express'
import controller from './controller.ts'
import guard from '#server/middleware/guard.ts'

let router = Router()

router.post('/register', controller.register)
router.post('/login', controller.login)
router.post('/logout', controller.logout)
router.put('/password', guard, controller.changePassword)
router.post('/reset-password', controller.resetPassword)
router.post('/password-reset-code', guard, controller.createResetCode)

export default router
