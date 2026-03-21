import { loadEnvFile } from 'node:process'
import { styleText } from 'node:util'
import vine, { errors } from '@vinejs/vine'

// `loadEnvFile()` throws an error if no `.env` file found
// Someimes the variables are set by the host environment instead
// We will check if the variables are set next
try { loadEnvFile() } catch {}

// define what the `.env` file should include
let schema = vine.object({
  PORT: vine.number().positive().min(1024).max(65535),
  DATABASE_URL: vine.string(),
  // production does not need a test database
  TEST_DATABASE_URL: vine.string().optional()
})

try { await vine.validate({ schema, data: process.env }) }
catch (error) {
  // is this error due to a validation fail?
  if (error instanceof errors.E_VALIDATION_ERROR) {
    // if so, log each validation error message
    console.error(styleText('red', "Environment variables not set correctly!"))
    for(let errorMessage of error.messages) {
      console.error(styleText('red', "  ✗ " + errorMessage.message))
    }
  }
  process.exit(1)
}
