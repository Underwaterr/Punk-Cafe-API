import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import guard from './middleware/guard.ts'
import logger from './middleware/logger.ts'
import { generalLimit } from './middleware/rate-limiter.ts'
import entitiesRouter from './entities/router.ts'
import servicesRouter from './services/router.ts'

let app = express()

// Disable unnecessary 'x-powered-by' header that Express adds by default
app.disable('x-powered-by')

// Because we'll be behind a proxy, 
// this lets our rate-lmiter see the client's real IP via the `X-Forwarded-For` header
app.set('trust proxy', 1)

// Rate limiting
app.use(generalLimit)

// Parse incoming JSON requests
app.use(express.json({ limit: '1mb' }))

// Parse URL query strings
app.use(express.urlencoded({extended: true}))

// log routes
if (process.env.NODE_ENV != 'test') app.use(logger)

// These routes are public
app.get('/', (_, response)=> { response.json({ok: true}) })
app.use(servicesRouter)

// All remaining routes are private
app.use(guard)
app.get('/secret', (_, response)=> { response.json({ok: true}) })
app.use(entitiesRouter)

// 404
app.use((_request, response)=> {
  response
    .status(404)
    .json({ error: 'Not found' })
})

// Global error handler
app.use((error:Error, _request:Request, response:Response, _next:NextFunction)=> {
  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
})

export default app
