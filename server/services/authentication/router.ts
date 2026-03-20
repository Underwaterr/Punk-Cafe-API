import { Router } from 'express'
import controller from './controller.ts'

let router = Router()

router.post('/register', controller.register)
//router.post('/login', controller.login)

export default router
