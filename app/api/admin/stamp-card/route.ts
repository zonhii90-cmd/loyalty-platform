import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db = sql()
  const rows = await db`
    SELECT sc.*,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'membershipId', ms.membership_id,
          'count', ms.count,
          'completed_count', ms.completed_count
        )) FROM member_stamps ms WHERE ms.stamp_card_id = sc.id),
        '[]'
      ) as stamp_data
    FROM stamp_cards sc
    WHERE sc.company_id = ${auth.companyId} AND sc.active = true
    LIMIT 1
  `
  return NextResponse.json({ stampCard: rows[0] || null })
}

export async function PUT(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const { goal, reward_text, earn_mode } = await req.json()
  if (!goal || goal < 2 || !reward_text?.trim()) {
    return NextResponse.json({ error: 'goal (min 2) and reward_text required' }, { status: 400 })
  }
  if (earn_mode && !['qr', 'manual'].includes(earn_mode)) {
    return NextResponse.json({ error: 'earn_mode must be qr or manual' }, { status: 400 })
  }

  const db = sql()
  // Deactivate any existing active card first
  await db`UPDATE stamp_cards SET active = false WHERE company_id = ${auth.companyId} AND active = true`

  const rows = await db`
    INSERT INTO stamp_cards (company_id, goal, reward_text, earn_mode, active)
    VALUES (${auth.companyId}, ${goal}, ${reward_text.trim()}, ${earn_mode || 'qr'}, true)
    RETURNING *
  `
  return NextResponse.json({ stampCard: rows[0] })
}

export async function DELETE(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db = sql()
  await db`UPDATE stamp_cards SET active = false WHERE company_id = ${auth.companyId} AND active = true`
  return NextResponse.json({ success: true })
}
