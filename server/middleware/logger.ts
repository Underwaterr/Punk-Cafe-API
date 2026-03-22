import pino from 'pino'
import type { Request, Response, NextFunction } from 'express'

let environment = process.env.NODE_ENV
let logOptions = { level: 'info', transport:null }
if (environment == 'development') {
  logOptions.transport = {
    target: 'pino-pretty',
    options: { 
      colorize: true,
      messageFormat: '{user} {status} {method} {path} ({duration}ms)',
      ignore: 'pid,hostname,method,path,status,duration,user',
      singleLine: true,
    }
  }
}
let logger = pino(logOptions)

export default function logRequest(request:Request, response:Response, next:NextFunction) {
  let start = Date.now()

  response.on('finish', ()=> {
    let duration = Date.now() - start
    logger.info({
      user: request.user?.username ?? null,
      method: request.method,
      path: request.originalUrl,
      status: response.statusCode,
      duration,
    })
  })

  next()
}

