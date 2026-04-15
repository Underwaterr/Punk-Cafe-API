import rateLimit from 'express-rate-limit'

const IS_TEST = process.env.NODE_ENV == 'test'
const FIFTEEN_MINUTES = 15 * 60 * 1000

// 1000 requests per 15 minutes for normal usage
export let generalLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 1000,
  message: { error: 'Too many requests. Try again later.' },
})

// 10 attempts per 15 minutes for login and registration, since those are the brute force targets
export let authenticationLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  skip: ()=> IS_TEST,
  message: { error: 'Too many attempts. Try again later.' },
})
