import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { notify } from '@/lib/notify'
import { authorizeCron } from '@/lib/cronAuth'
import { addEarnPoints } from '@/lib/tierUtils'

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = sql()

  // Members whose birthday is today (month + day match)
  const members = await db`
    SELECT m.id AS member_id, m.phone, m.name,
           ms.id AS membership_id, ms.company_id, ms.points
    FROM members m
    JOIN memberships ms ON ms.member_id = m.id
    WHERE m.birthday IS NOT NULL
      AND EXTRACT(MONTH FROM m.birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY   FROM m.birthday) = EXTRACT(DAY   FROM CURRENT_DATE)
  `

  let awarded = 0

  for (const row of members) {
    // Skip if already awarded birthday points this calendar year
    const already = await db`
      SELECT 1 FROM points_ledger
      WHERE membership_id = ${row.membership_id}
        AND source = 'birthday'
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
      LIMIT 1
    `
    if (already.length) continue

    // Fetch birthday points from company settings
    const settingsRow = await db`SELECT data FROM settings WHERE id = ${row.company_id}`
    const pts = parseInt(settingsRow[0]?.data?.birthdayPoints ?? '0', 10)
    if (!pts) continue

    const { newBalance } = await addEarnPoints(
      row.membership_id, row.company_id, pts,
      'birthday', 'Happy Birthday bonus',
    )

    await notify(row.phone, row.company_id, 'points_earned', { points: pts, balance: newBalance })
    awarded++
  }

  return NextResponse.json({ awarded })
}
