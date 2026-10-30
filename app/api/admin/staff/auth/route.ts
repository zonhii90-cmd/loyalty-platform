import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyPin } from '@/lib/staffAuth'

export async function POST(req: NextRequest) {
  const { companyId, pin } = await req.json()
  if (!companyId || !pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'companyId and 4-digit PIN required' }, { status: 400 })
  }

  const db = sql()

  // Load all active staff for the company (small set, avoids timing oracle)
  const staffRows = await db`
    SELECT s.id, s.name, s.pin, s.role, c.name as company_name, c.slug, c.primary_color
    FROM staff s
    JOIN companies c ON c.id = s.company_id
    WHERE s.company_id = ${companyId} AND s.active = true
  `

  for (const s of staffRows) {
    if (await verifyPin(pin, s.pin)) {
      return NextResponse.json({
        staffId:      s.id,
        staffName:    s.name,
        staffRole:    s.role,
        companyId,
        companyName:  s.company_name,
        companySlug:  s.slug,
        primaryColor: s.primary_color,
      })
    }
  }

  return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
}
