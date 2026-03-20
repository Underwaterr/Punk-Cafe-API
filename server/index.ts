import http from 'node:http'
import app from './app.ts'

let httpServer = http.createServer()

let logServerStart = function() {
  let timestampLocaleOptions = { timeZone: 'America/New_York' }
  let timestamp = new Date().toLocaleString('en-US', timestampLocaleOptions)
  process.stdout.write(`Server started at ${timestamp}\n`)
  process.stdout.write(`Server listening on port ${process.env['PORT']}\n`)
}

httpServer.on('request', app) // pass all requests to Express middleware
httpServer.on('listening', logServerStart)

export default httpServer
