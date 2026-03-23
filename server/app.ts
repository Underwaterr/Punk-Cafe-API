import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import logger from './middleware/logger.ts'
import { generalLimit } from './middleware/rate-limiter.ts'
import router from './router.ts'

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

// log routes unless we're testing
if (process.env.NODE_ENV != 'test') app.use(logger)

// our root-level router
app.use(router)

export default app
