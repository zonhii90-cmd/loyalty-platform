import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'
import { toE164, sendKapso } from '@/lib/kapso'

type Segment = 'all' | 'new' | 'active' | 'at_risk' | 'lapsed'

function buildFilter(db: ReturnType<typeof sql>, segment: Segment) {
  switch (segment) {
    case 'new':     return db`AND ms.joined_at > now() - interval '14 days'`
    case 'active':  return db`AND ms.last_activity_at > now() - interval '30 days'`
    case 'at_risk': return db`AND ms.last_activity_at BETWEEN now() - interval '90 days' AND now() - interval '30 days' AND ms.points > 0`
    case 'lapsed':  return db`AND (ms.last_activity_at < now() - interval '90 days' OR ms.last_activity_at IS NULL) AND ms.points > 0`
    default:        return db``
  }
}

// GET — estimate recipient count for a segment
export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const segment = (req.nextUrl.searchParams.get('segment') || 'all') as Segment
  const db = sql()
  const filter = buildFilter(db, segment)

  const rows = await db`
    SELECT COUNT(*) AS total
    FROM memberships ms
    JOIN members m ON m.id = ms.member_id
    WHERE ms.company_id = ${auth.companyId} ${filter}
  `
  return NextResponse.json({ total: parseInt(rows[0].total as string) })
}

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const { message, segment = 'all' } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

  if (!process.env.KAPSO_API_KEY || !process.env.KAPSO_PHONE_NUMBER_ID) {
    return NextResponse.json({ error: 'Kapso not configured' }, { status: 500 })
  }

  const db = sql()
  const filter = buildFilter(db, segment as Segment)

  const [settingsRows, companyRows, members] = await Promise.all([
    db`SELECT data FROM settings WHERE id = ${auth.companyId} LIMIT 1`,
    db`SELECT name FROM companies WHERE id = ${auth.companyId} LIMIT 1`,
    db`
      SELECT DISTINCT m.phone
      FROM memberships ms
      JOIN members m ON m.id = ms.member_id
      WHERE ms.company_id = ${auth.companyId} ${filter}
      LIMIT 500
    `,
  ])

  const companyName = companyRows[0]?.name || ''
  const text        = message.trim().replace(/\{company\}/g, companyName)

  let sent = 0, failed = 0
  const BATCH = 10
  for (let i = 0; i < members.length; i += BATCH) {
    const results = await Promise.allSettled(
      members.slice(i, i + BATCH).map(row => sendKapso(toE164(row.phone as string), text))
    )
    for (const r of results) {
      r.status === 'fulfilled' && r.value ? sent++ : failed++
    }
  }

  return NextResponse.json({ sent, failed, total: members.length })
}
