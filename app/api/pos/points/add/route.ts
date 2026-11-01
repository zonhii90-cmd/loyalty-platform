import { NextRequest, NextResponse } from 'next/server'
import { validateStaff, staffUnauthorized } from '@/lib/staffAuth'
import { addEarnPoints } from '@/lib/tierUtils'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const staff = await validateStaff(req)
  if (!staff) return staffUnauthorized()

  const { membershipId, points, note } = await req.json()
  const pts = Number(points)
  if (!membershipId || !pts || pts <= 0 || pts > 10000) {
    return NextResponse.json({ error: 'membershipId and points (1–10000) required' }, { status: 400 })
  }

  const db = sql()
  const msRows = await db`
    SELECT id FROM memberships WHERE id = ${membershipId} AND company_id = ${staff.companyId} LIMIT 1
  `
  if (!msRows[0]) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

  const { newBalance, tier } = await addEarnPoints(
    membershipId, staff.companyId, pts,
    'manual', note?.trim() || `Staff: ${staff.staffName || 'cashier'}`,
  )

  return NextResponse.json({ success: true, points: newBalance, tier })
}
