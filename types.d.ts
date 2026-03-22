export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string
      DATABASE_URL: string,
      UPLOAD_DIRECTORY: string
    }
  }
  namespace Express {
    interface Request {
      user?: import('./prisma/generated/client.ts').User,
      sessionToken?: string,
      sessionId?: string
    }
  }
}
