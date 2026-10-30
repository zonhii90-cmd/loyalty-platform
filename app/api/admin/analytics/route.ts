import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const cid = auth.companyId
  const db  = sql()

  const [overview, membersByDay, pointsByDay, topMembers, stampStats, tierBreakdown, campaignStats] = await Promise.all([

    // Overview tiles
    db`
      SELECT
        (SELECT COUNT(*)                FROM memberships          WHERE company_id = ${cid})                                                         AS total_members,
        (SELECT COUNT(*)                FROM memberships          WHERE company_id = ${cid} AND last_activity_at > now() - interval '30 days')       AS active_30d,
        (SELECT COALESCE(SUM(amount),0) FROM points_ledger pl JOIN memberships ms ON ms.id = pl.membership_id WHERE ms.company_id = ${cid} AND pl.type = 'earn' AND pl.created_at > now() - interval '30 days') AS earned_30d,
        (SELECT COUNT(*)                FROM vouchers v  JOIN memberships ms ON ms.id = v.membership_id WHERE ms.company_id = ${cid} AND v.redeemed_at IS NOT NULL) AS vouchers_redeemed
    `,

    // New members by day — last 30 days
    db`
      SELECT date_trunc('day', joined_at)::date AS day, COUNT(*) AS count
      FROM memberships
      WHERE company_id = ${cid} AND joined_at > now() - interval '30 days'
      GROUP BY 1 ORDER BY 1
    `,

    // Points earned & redeemed by day — last 30 days
    db`
      SELECT date_trunc('day', pl.created_at)::date AS day,
             pl.type,
             SUM(ABS(pl.amount)) AS total
      FROM points_ledger pl
      JOIN memberships ms ON ms.id = pl.membership_id
      WHERE ms.company_id = ${cid}
        AND pl.created_at > now() - interval '30 days'
        AND pl.type IN ('earn', 'redeem')
      GROUP BY 1, 2 ORDER BY 1
    `,

    // Top 10 members by points
    db`
      SELECT m.name, m.phone, ms.points, ms.tier, ms.last_activity_at
      FROM memberships ms
      JOIN members m ON m.id = ms.member_id
      WHERE ms.company_id = ${cid}
      ORDER BY ms.points DESC LIMIT 10
    `,

    // Tier breakdown
    db`
      SELECT tier, COUNT(*) AS count
      FROM memberships
      WHERE company_id = ${cid}
      GROUP BY tier
    `,

    // Campaign performance (all-time)
    db`
      SELECT c.name, c.multiplier, c.starts_at, c.ends_at, c.active,
             COUNT(pl.id) AS scans,
             COALESCE(SUM(pl.amount), 0) AS total_points
      FROM campaigns c
      LEFT JOIN points_ledger pl ON pl.note LIKE '%' || c.name || '%'
        AND pl.source = 'qr_scan'
        AND pl.membership_id IN (SELECT id FROM memberships WHERE company_id = ${cid})
      WHERE c.company_id = ${cid}
      GROUP BY c.id, c.name, c.multiplier, c.starts_at, c.ends_at, c.active
      ORDER BY scans DESC
    `,

    // Stamp card stats
    db`
      SELECT
        COUNT(*)                                                          AS total_cards,
        COALESCE(SUM(ms2.completed_count), 0)                             AS total_completed,
        COALESCE(SUM(ms2.count), 0)                                       AS stamps_in_progress,
        COALESCE(AVG(ms2.count::numeric), 0)                              AS avg_current_stamps,
        sc.goal
      FROM member_stamps ms2
      JOIN stamp_cards sc ON sc.id = ms2.stamp_card_id
      WHERE sc.company_id = ${cid} AND sc.active = true
      GROUP BY sc.goal
      LIMIT 1
    `,
  ])

  return NextResponse.json({
    overview:     overview[0],
    membersByDay: membersByDay.map(r => ({ day: r.day, count: Number(r.count) })),
    pointsByDay:  pointsByDay.map(r => ({ day: r.day, type: r.type, total: Number(r.total) })),
    topMembers:   topMembers.map(r => ({ ...r, points: Number(r.points) })),
    tierBreakdown: tierBreakdown.map(r => ({ tier: r.tier, count: Number(r.count) })),
    campaignStats: campaignStats.map(r => ({
      name: r.name, multiplier: Number(r.multiplier),
      starts_at: r.starts_at, ends_at: r.ends_at, active: r.active,
      scans: Number(r.scans), total_points: Number(r.total_points),
    })),
    stampStats:   stampStats[0] ? {
      total_cards:       Number(stampStats[0].total_cards),
      total_completed:   Number(stampStats[0].total_completed),
      stamps_in_progress: Number(stampStats[0].stamps_in_progress),
      avg_current_stamps: parseFloat(Number(stampStats[0].avg_current_stamps).toFixed(1)),
      goal:              Number(stampStats[0].goal),
    } : null,
  })
}
