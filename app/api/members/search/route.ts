import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin } from '@/lib/adminAuth'
import { validateStaff } from '@/lib/staffAuth'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  // Accept admin or staff auth
  const admin = await validateAdmin(req)
  const staff = !admin ? await validateStaff(req) : null
  if (!admin && !staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = admin?.companyId ?? staff?.companyId

  const db = sql()
  const results = await db`
    SELECT m.phone, m.name, ms.points, ms.tier, ms.id AS membership_id
    FROM members m
    JOIN memberships ms ON ms.member_id = m.id
    WHERE ms.company_id = ${companyId}
      AND (
        LOWER(m.name)  LIKE LOWER(${'%' + q + '%'})
        OR m.phone LIKE ${'%' + q + '%'}
      )
    ORDER BY m.name NULLS LAST
    LIMIT 10
  `

  return NextResponse.json({ results })
}
