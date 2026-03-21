import express from 'express'
import guard from './guard.ts'
import entitiesRouter from './entities/router.ts'
import servicesRouter from './services/router.ts'

let app = express()

// Disable unnecessary 'x-powered-by' header that Express adds by default
app.disable('x-powered-by')

// Parse incoming JSON requests
app.use(express.json())

// Parse URL query strings
app.use(express.urlencoded({extended: true}))

// These routes are public
app.get('/', (_, response)=> { response.json({ok: true}) })
app.use(servicesRouter)

// All remaining routes are private
app.use(guard)
app.get('/secret', (_, response)=> { response.json({ok: true}) })
app.use(entitiesRouter)

// 404 handler — must be last
app.use((_request, response)=> {
  response
    .status(404)
    .json({ error: 'Not found' })
})

export default app
