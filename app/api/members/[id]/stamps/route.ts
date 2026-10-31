import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: membershipId } = await params

  const db = sql()
  const rows = await db`
    SELECT ms.count, ms.completed_count,
           sc.goal, sc.reward_text, sc.earn_mode,
           sc.accent_color, sc.stamp_icon, sc.card_bg
    FROM member_stamps ms
    JOIN stamp_cards sc ON sc.id = ms.stamp_card_id
    WHERE ms.membership_id = ${membershipId} AND sc.active = true
    LIMIT 1
  `
  return NextResponse.json({ stamp: rows[0] || null }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
