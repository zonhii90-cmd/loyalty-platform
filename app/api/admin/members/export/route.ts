import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db = sql()
  const rows = await db`
    SELECT m.name, m.phone, m.birthday,
           ms.points, ms.lifetime_points, ms.tier, ms.joined_at, ms.last_activity_at
    FROM memberships ms
    JOIN members m ON m.id = ms.member_id
    WHERE ms.company_id = ${auth.companyId}
    ORDER BY ms.points DESC
  `

  const header = 'Name,Phone,Birthday,Points,LifetimePoints,Tier,JoinedAt,LastActivity'
  const body = rows.map(r => [
    r.name  || '',
    r.phone || '',
    r.birthday ? String(r.birthday).slice(0, 10) : '',
    r.points,
    r.lifetime_points,
    r.tier,
    r.joined_at  ? String(r.joined_at).slice(0, 10)  : '',
    r.last_activity_at ? String(r.last_activity_at).slice(0, 10) : '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')

  const csv = header + '\n' + body
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="members-${date}.csv"`,
    },
  })
}
