import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateStaff, staffUnauthorized } from '@/lib/staffAuth'

export async function GET(req: NextRequest) {
  const auth = await validateStaff(req)
  if (!auth) return staffUnauthorized()

  const db = sql()
  const rows = await db`
    SELECT earn_mode, goal, reward_text, active
    FROM stamp_cards
    WHERE company_id = ${auth.companyId} AND active = true
    LIMIT 1
  `
  return NextResponse.json({ stampCard: rows[0] || null })
}
