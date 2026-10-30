import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { notify } from '@/lib/notify'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    await db`
      INSERT INTO points_ledger (membership_id, type, amount, source, note)
      VALUES (${row.membership_id}, 'earn', ${pts}, 'birthday', 'Happy Birthday bonus')
    `
    await db`
      UPDATE memberships SET points = points + ${pts}, last_activity_at = now()
      WHERE id = ${row.membership_id}
    `

    await notify(row.phone, row.company_id, 'points_earned', { points: pts, balance: (row.points as number) + pts })
    awarded++
  }

  return NextResponse.json({ awarded })
}
