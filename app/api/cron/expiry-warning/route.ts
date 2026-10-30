import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { notify } from '@/lib/notify'
import { authorizeCron } from '@/lib/cronAuth'

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = sql()

  // Find memberships with points that will expire within 7 days
  // (using last_activity_at + company expiry window from settings)
  // For now: warn members who have points and haven't visited in 80+ days (with 90-day expiry)
  const at_risk = await db`
    SELECT ms.id, ms.points, ms.company_id, m.phone
    FROM memberships ms
    JOIN members m ON m.id = ms.member_id
    WHERE ms.points > 0
      AND ms.last_activity_at < now() - interval '80 days'
      AND ms.last_activity_at > now() - interval '90 days'
  `

  let sent = 0
  for (const row of at_risk) {
    await notify(row.phone, row.company_id, 'expiry_warning', { expiryDays: 10 })
    sent++
  }

  return NextResponse.json({ success: true, sent })
}
