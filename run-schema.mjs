// One-time schema migration runner
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse .env.local — strip surrounding quotes, handle &amp;
const envPath = resolve(__dirname, '.env.local')
const envVars = Object.fromEntries(
  readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      let val = l.slice(i + 1).trim()
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      val = val.replace(/&amp;/g, '&')
      return [l.slice(0, i).trim(), val]
    })
)

// Try unpooled first, fall back to pooled
const connStr = envVars.DATABASE_URL_UNPOOLED || envVars.DATABASE_URL
if (!connStr) { console.error('No DATABASE_URL found in .env.local'); process.exit(1) }

// Show first part of URL for debugging (scheme + host only, no password)
try {
  const u = new URL(connStr)
  console.log(`Connecting to: ${u.protocol}//${u.hostname}${u.pathname}`)
} catch (e) {
  console.error('URL parse error:', e.message)
  console.error('Raw value (first 30 chars):', JSON.stringify(connStr.slice(0, 30)))
  process.exit(1)
}

const sql = neon(connStr)

const schema = readFileSync(resolve(__dirname, 'perkly-schema.sql'), 'utf8')

const statements = schema
  .replace(/--[^\n]*/g, '')
  .split(';')
  .map(s => s.trim())
  .filter(Boolean)

console.log(`\nRunning ${statements.length} statements...\n`)

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 70)
  process.stdout.write(preview + '... ')
  try {
    await sql.query(stmt)
    console.log('✓')
  } catch (e) {
    console.log('✗  ' + e.message)
  }
}

console.log('\nDone.')
