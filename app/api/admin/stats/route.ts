import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db  = sql()
  const cid = auth.companyId

  const [totalRow] = await db`
    SELECT COUNT(*) AS total FROM memberships WHERE company_id = ${cid}
  `
  const [issuedRow] = await db`
    SELECT COALESCE(SUM(pl.amount), 0) AS total
    FROM points_ledger pl
    JOIN memberships ms ON ms.id = pl.membership_id
    WHERE ms.company_id = ${cid} AND pl.type = 'earn'
  `
  const [balanceRow] = await db`
    SELECT COALESCE(SUM(points), 0) AS total FROM memberships WHERE company_id = ${cid}
  `
  const [monthRow] = await db`
    SELECT COUNT(*) AS total FROM memberships
    WHERE company_id = ${cid}
    AND joined_at >= date_trunc('month', now())
  `
  const recentActivity = await db`
    SELECT pl.id, pl.type, pl.amount, pl.source, pl.note, pl.created_at,
           m.phone, m.name
    FROM points_ledger pl
    JOIN memberships ms ON ms.id = pl.membership_id
    JOIN members m ON m.id = ms.member_id
    WHERE ms.company_id = ${cid}
    ORDER BY pl.created_at DESC
    LIMIT 10
  `

  return NextResponse.json({
    totalMembers:      parseInt(totalRow.total,   10),
    totalPointsIssued: parseInt(issuedRow.total,  10),
    totalPointsBalance:parseInt(balanceRow.total, 10),
    newThisMonth:      parseInt(monthRow.total,   10),
    recentActivity,
  })
}
