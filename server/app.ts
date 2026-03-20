import express from 'express'
import entitiesRouter from './entities/router.ts'

let app = express()

// Disable unnecessary 'x-powered-by' header that Express adds by default
app.disable('x-powered-by')

// Parse incoming JSON requests
app.use(express.json())

// Parse URL query strings
app.use(express.urlencoded({extended: true}))

// Health Check Route
app.get('/', (_, response)=> {
  response.json({ok: true})
})

app.use(entitiesRouter)

// 404 handler — must be last
app.use((_request, response)=> {
  response
    .status(404)
    .json({ error: 'Not found' })
})

export default app
