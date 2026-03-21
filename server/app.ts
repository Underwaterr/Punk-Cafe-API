import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import guard from './guard.ts'
import logger from './logger.ts'
import entitiesRouter from './entities/router.ts'
import servicesRouter from './services/router.ts'

let app = express()

// Disable unnecessary 'x-powered-by' header that Express adds by default
app.disable('x-powered-by')

// Parse incoming JSON requests
app.use(express.json())

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
