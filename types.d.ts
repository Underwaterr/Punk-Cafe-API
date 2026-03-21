export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string
      DATABASE_URL: string,
      TEST_DATABASE_URL: string
    }
  }
  namespace Express {
    interface Request {
      user?: import('./prisma/generated/client.ts').User
    }
  }
}
