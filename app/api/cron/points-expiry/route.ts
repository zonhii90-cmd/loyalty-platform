import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { notify } from '@/lib/notify'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = sql()

  // Get all company expiry settings
  const companies = await db`SELECT id, data FROM settings`
  let expired = 0

  for (const co of companies) {
    const days = parseInt(co.data?.expiry_days ?? '365', 10)
    if (!days) continue

    // Memberships with positive points, inactive for `days` days
    const stale = await db`
      SELECT ms.id, ms.points, m.phone
      FROM memberships ms
      JOIN members m ON m.id = ms.member_id
      WHERE ms.company_id = ${co.id}
        AND ms.points > 0
        AND ms.last_activity_at < now() - (${days} || ' days')::interval
    `

    for (const ms of stale) {
      const pts = ms.points as number
      await db`
        INSERT INTO points_ledger (membership_id, type, amount, source, note)
        VALUES (${ms.id}, 'adjust', ${-pts}, 'adjustment', 'Points expired due to inactivity')
      `
      await db`UPDATE memberships SET points = 0 WHERE id = ${ms.id}`
      await notify(ms.phone as string, co.id, 'expiry_warning', { points: pts })
      expired++
    }
  }

  return NextResponse.json({ expired })
}
