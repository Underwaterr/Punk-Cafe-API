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

export default app
