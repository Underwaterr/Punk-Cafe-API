import { Router } from 'express'
import guard from './middleware/guard.ts'
import entitiesRouter from './entities/router.ts'
import servicesRouter from './services/router.ts'

let router = Router()

// These routes are public
router.get('/', (_, response)=> { response.json({ok: true}) })
router.use(servicesRouter)

// All remaining routes are private
router.use(guard)
router.get('/secret', (_, response)=> { response.json({ok: true}) })
router.use(entitiesRouter)

// 404
router.use((_request, response)=> {
  response
    .status(404)
    .json({ error: 'Not found' })
})

// Global error handler
router.use((error:Error, _request:Request, response:Response, _next:NextFunction)=> {
  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
})

export default router
