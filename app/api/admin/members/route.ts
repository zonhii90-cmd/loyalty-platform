import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

// GET /api/admin/members?page=1&q=search
export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const page    = parseInt(req.nextUrl.searchParams.get('page') || '1', 10)
  const q       = req.nextUrl.searchParams.get('q')?.trim() || ''
  const segment = req.nextUrl.searchParams.get('segment') || ''
  const limit   = 20
  const offset  = (page - 1) * limit

  const db = sql()

  const segmentFilter =
    segment === 'new'      ? db`AND ms.joined_at > now() - interval '14 days'` :
    segment === 'active'   ? db`AND ms.last_activity_at > now() - interval '30 days'` :
    segment === 'at_risk'  ? db`AND ms.last_activity_at BETWEEN now() - interval '90 days' AND now() - interval '30 days' AND ms.points > 0` :
    segment === 'lapsed'   ? db`AND (ms.last_activity_at < now() - interval '90 days' OR ms.last_activity_at IS NULL) AND ms.points > 0` :
    db``

  const [countRows, rows] = await Promise.all([
    db`
      SELECT COUNT(*) AS total
      FROM memberships ms
      JOIN members m ON m.id = ms.member_id
      WHERE ms.company_id = ${auth.companyId}
      ${q ? db`AND (m.phone ILIKE ${'%' + q + '%'} OR m.name ILIKE ${'%' + q + '%'})` : db``}
      ${segmentFilter}
    `,
    db`
      SELECT
        ms.id, ms.points, ms.tier, ms.joined_at, ms.last_activity_at,
        m.id AS member_id, m.phone, m.name, m.birthday, m.created_at AS member_created_at
      FROM memberships ms
      JOIN members m ON m.id = ms.member_id
      WHERE ms.company_id = ${auth.companyId}
      ${q ? db`AND (m.phone ILIKE ${'%' + q + '%'} OR m.name ILIKE ${'%' + q + '%'})` : db``}
      ${segmentFilter}
      ORDER BY ms.joined_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
  ])

  const members = rows.map((r: any) => ({
    id: r.id, points: r.points, tier: r.tier, joined_at: r.joined_at,
    last_activity_at: r.last_activity_at,
    member: { id: r.member_id, phone: r.phone, name: r.name, birthday: r.birthday, created_at: r.member_created_at },
  }))

  return NextResponse.json({ members, total: parseInt(countRows[0]?.total || '0', 10), page, limit })
}
