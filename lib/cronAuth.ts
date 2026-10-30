import { NextRequest } from 'next/server'

export function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // no secret set — allow (dev mode)

  // Vercel sends Authorization: Bearer <CRON_SECRET> on production cron calls
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${secret}`) return true

  // Also accept ?secret= for manual testing / curl
  if (req.nextUrl.searchParams.get('secret') === secret) return true

  return false
}
