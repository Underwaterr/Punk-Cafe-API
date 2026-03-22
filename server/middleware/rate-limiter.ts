import rateLimit from 'express-rate-limit'

const FIFTEEN_MINUTES = 15 * 60 * 1000

// 100 requests per 15 minutes for normal usage
export let generalLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 100,
  message: { error: 'Too many requests. Try again later.' },
})

// 10 attempts per 15 minutes for login and registration, since those are the brute force targets
export let authenticationLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  message: { error: 'Too many attempts. Try again later.' },
})
