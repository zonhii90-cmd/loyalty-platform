import { neon } from '@neondatabase/serverless'

// Pooled connection for app traffic (serverless/edge)
export function sql() {
  return neon(process.env.DATABASE_URL!)
}
