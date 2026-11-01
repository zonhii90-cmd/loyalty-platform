import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

async function queryStamps(membershipId: string) {
  const db = sql()
  const [rows, ptRows] = await Promise.all([
    db`
      SELECT ms.count, ms.completed_count,
             sc.goal, sc.reward_text, sc.earn_mode,
             sc.accent_color, sc.stamp_icon, sc.card_bg
      FROM member_stamps ms
      JOIN stamp_cards sc ON sc.id = ms.stamp_card_id
      WHERE ms.membership_id = ${membershipId} AND sc.active = true
      LIMIT 1
    `,
    db`SELECT points, lifetime_points, tier FROM memberships WHERE id = ${membershipId} LIMIT 1`,
  ])
  const ms = ptRows[0] ?? null
  return NextResponse.json({
    stamp: rows[0] || null,
    points: ms?.points ?? null,
    lifetime_points: ms?.lifetime_points ?? null,
    tier: ms?.tier ?? null,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store',
      'Pragma': 'no-cache',
    },
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return queryStamps(id)
}

// POST used by live polling so iOS WebKit never serves a cached response
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return queryStamps(id)
}
