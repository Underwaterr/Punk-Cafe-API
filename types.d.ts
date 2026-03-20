export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string
      DATABASE_URL: string,
      TEST_DATABASE_URL: string
    }
  }
}
