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

  const { goal, reward_text, earn_mode, accent_color, stamp_icon, card_bg } = await req.json()
  if (!goal || goal < 2 || !reward_text?.trim()) {
    return NextResponse.json({ error: 'goal (min 2) and reward_text required' }, { status: 400 })
  }
  if (earn_mode && !['qr', 'manual'].includes(earn_mode)) {
    return NextResponse.json({ error: 'earn_mode must be qr or manual' }, { status: 400 })
  }
  if (card_bg && !['white', 'gradient', 'dark'].includes(card_bg)) {
    return NextResponse.json({ error: 'card_bg must be white, gradient, or dark' }, { status: 400 })
  }

  const db = sql()

  // Update in-place so member_stamps rows keep their stamp_card_id reference
  const existing = await db`
    SELECT id FROM stamp_cards WHERE company_id = ${auth.companyId} AND active = true LIMIT 1
  `

  let rows
  if (existing[0]) {
    rows = await db`
      UPDATE stamp_cards SET
        goal        = ${goal},
        reward_text = ${reward_text.trim()},
        earn_mode   = ${earn_mode || 'qr'},
        accent_color = ${accent_color || '#F59E0B'},
        stamp_icon  = ${stamp_icon || '★'},
        card_bg     = ${card_bg || 'white'}
      WHERE id = ${existing[0].id}
      RETURNING *
    `
  } else {
    rows = await db`
      INSERT INTO stamp_cards (company_id, goal, reward_text, earn_mode, active, accent_color, stamp_icon, card_bg)
      VALUES (
        ${auth.companyId}, ${goal}, ${reward_text.trim()}, ${earn_mode || 'qr'}, true,
        ${accent_color || '#F59E0B'}, ${stamp_icon || '★'}, ${card_bg || 'white'}
      )
      RETURNING *
    `
  }
  return NextResponse.json({ stampCard: rows[0] })
}

export async function DELETE(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db = sql()
  await db`UPDATE stamp_cards SET active = false WHERE company_id = ${auth.companyId} AND active = true`
  return NextResponse.json({ success: true })
}
