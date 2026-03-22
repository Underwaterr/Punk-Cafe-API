import pino from 'pino'

let environment = process.env.NODE_ENV

let logOptions = { level: 'info', transport: null }

if (environment == 'development') {
  logOptions.transport = {
    target: 'pino-pretty',
    options: { 
      colorize: true,
      singleLine: true,
    }
  }
}

export default pino(logOptions)
