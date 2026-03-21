import argon2 from 'argon2'

let options: Parameters<typeof argon2.hash>[1] = 
  process.env.NODE_ENV === 'test' 
    ? { memoryCost: 1024, timeCost: 1, parallelism: 1 }
    : undefined // argon2 defaults

export default options
