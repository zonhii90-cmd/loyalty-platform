import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db  = sql()
  const cid = auth.companyId

  const [
    totalRow, issuedRow, balanceRow, monthRow,
    todayRow,
    recentActivity,
  ] = await Promise.all([

    db`SELECT COUNT(*) AS total FROM memberships WHERE company_id = ${cid}`,

    db`SELECT COALESCE(SUM(pl.amount), 0) AS total
       FROM points_ledger pl JOIN memberships ms ON ms.id = pl.membership_id
       WHERE ms.company_id = ${cid} AND pl.type = 'earn'`,

    db`SELECT COALESCE(SUM(points), 0) AS total FROM memberships WHERE company_id = ${cid}`,

    db`SELECT COUNT(*) AS total FROM memberships
       WHERE company_id = ${cid} AND joined_at >= date_trunc('month', now())`,

    // Today stats
    db`SELECT
         (SELECT COUNT(*) FROM memberships
          WHERE company_id = ${cid}
            AND joined_at >= CURRENT_DATE) AS new_today,
         (SELECT COUNT(*) FROM points_ledger pl
          JOIN memberships ms ON ms.id = pl.membership_id
          WHERE ms.company_id = ${cid}
            AND pl.source = 'qr_scan'
            AND pl.created_at >= CURRENT_DATE) AS scans_today,
         (SELECT COUNT(*) FROM vouchers v
          JOIN memberships ms ON ms.id = v.membership_id
          WHERE ms.company_id = ${cid}
            AND v.redeemed_at >= CURRENT_DATE) AS vouchers_redeemed_today,
         (SELECT COALESCE(SUM(pl.amount), 0) FROM points_ledger pl
          JOIN memberships ms ON ms.id = pl.membership_id
          WHERE ms.company_id = ${cid}
            AND pl.type = 'earn'
            AND pl.created_at >= CURRENT_DATE) AS points_today`,

    db`SELECT pl.id, pl.type, pl.amount, pl.source, pl.note, pl.created_at,
              m.phone, m.name
       FROM points_ledger pl
       JOIN memberships ms ON ms.id = pl.membership_id
       JOIN members m      ON m.id  = ms.member_id
       WHERE ms.company_id = ${cid}
       ORDER BY pl.created_at DESC
       LIMIT 12`,
  ])

  const today = todayRow[0]

  return NextResponse.json({
    totalMembers:       parseInt(totalRow[0].total,   10),
    totalPointsIssued:  parseInt(issuedRow[0].total,  10),
    totalPointsBalance: parseInt(balanceRow[0].total, 10),
    newThisMonth:       parseInt(monthRow[0].total,   10),
    today: {
      newMembers:       parseInt(today.new_today,              10),
      scans:            parseInt(today.scans_today,            10),
      vouchersRedeemed: parseInt(today.vouchers_redeemed_today, 10),
      pointsEarned:     parseInt(today.points_today,           10),
    },
    recentActivity,
  })
}
