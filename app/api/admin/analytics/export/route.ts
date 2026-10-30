import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db = sql()
  const rows = await db`
    SELECT
      m.phone,
      COALESCE(m.name, '')          AS name,
      ms.points,
      ms.tier,
      ms.joined_at,
      ms.last_activity_at,
      COALESCE(
        (SELECT SUM(ms2.completed_count) FROM member_stamps ms2
         JOIN stamp_cards sc ON sc.id = ms2.stamp_card_id
         WHERE ms2.membership_id = ms.id AND sc.active = true), 0
      )                             AS stamps_completed,
      COALESCE(
        (SELECT COUNT(*) FROM vouchers v WHERE v.membership_id = ms.id AND v.redeemed_at IS NOT NULL), 0
      )                             AS vouchers_used
    FROM memberships ms
    JOIN members m ON m.id = ms.member_id
    WHERE ms.company_id = ${auth.companyId}
    ORDER BY ms.points DESC
  `

  const header = 'Phone,Name,Points,Tier,Joined,Last Active,Stamps Completed,Vouchers Used\n'
  const body   = rows.map(r =>
    [
      r.phone,
      `"${(r.name as string).replace(/"/g, '""')}"`,
      r.points,
      r.tier,
      new Date(r.joined_at as string).toLocaleDateString(),
      r.last_activity_at ? new Date(r.last_activity_at as string).toLocaleDateString() : '',
      r.stamps_completed,
      r.vouchers_used,
    ].join(',')
  ).join('\n')

  const csv  = header + body
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="members-${date}.csv"`,
    },
  })
}
