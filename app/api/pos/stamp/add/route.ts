import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateStaff, staffUnauthorized } from '@/lib/staffAuth'
import { notify } from '@/lib/notify'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const staff = await validateStaff(req)
  if (!staff) return staffUnauthorized()

  const { membershipId } = await req.json()
  if (!membershipId) {
    return NextResponse.json({ error: 'membershipId required' }, { status: 400 })
  }

  const db = sql()

  // Verify membership belongs to this company
  const msRows = await db`
    SELECT * FROM memberships WHERE id = ${membershipId} AND company_id = ${staff.companyId} LIMIT 1
  `
  if (!msRows[0]) {
    return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  }
  const membership = msRows[0]

  const cardRows = await db`
    SELECT * FROM stamp_cards
    WHERE company_id = ${staff.companyId} AND active = true AND earn_mode = 'manual'
    LIMIT 1
  `
  if (!cardRows[0]) {
    return NextResponse.json({ error: 'No active manual stamp card configured' }, { status: 404 })
  }
  const card = cardRows[0]

  // Get or create member_stamps row
  const existingStamp = await db`
    SELECT * FROM member_stamps WHERE membership_id = ${membershipId} AND stamp_card_id = ${card.id} LIMIT 1
  `
  let stampRow: any
  if (existingStamp[0]) {
    stampRow = existingStamp[0]
  } else {
    const created = await db`
      INSERT INTO member_stamps (membership_id, stamp_card_id)
      VALUES (${membershipId}, ${card.id})
      RETURNING *
    `
    stampRow = created[0]
  }

  // Card is already complete — cashier must confirm reward before adding new stamps
  if (stampRow.count >= card.goal) {
    return NextResponse.json({ error: 'Card complete — confirm the reward first' }, { status: 400 })
  }

  const newCount  = stampRow.count + 1
  const completed = newCount >= card.goal

  let voucherCode: string | null = null
  if (completed) {
    voucherCode = generateCode()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    // Keep count at goal so completed state is visible until staff resets
    await db`
      UPDATE member_stamps
      SET count = ${card.goal}, completed_count = completed_count + 1, updated_at = now()
      WHERE id = ${stampRow.id}
    `
    await db`
      INSERT INTO vouchers (membership_id, stamp_card_id, code, type, description, expires_at)
      VALUES (${membershipId}, ${card.id}, ${voucherCode}, 'stamp', ${card.reward_text}, ${expires.toISOString()})
    `
  } else {
    await db`
      UPDATE member_stamps SET count = ${newCount}, updated_at = now() WHERE id = ${stampRow.id}
    `
  }

  const message = completed
    ? `Card complete! Voucher ${voucherCode} issued for: ${card.reward_text}`
    : `Stamp added (${newCount}/${card.goal})`

  // Fetch member phone for notification
  const memberRows = await db`
    SELECT m.phone FROM memberships ms JOIN members m ON m.id = ms.member_id
    WHERE ms.id = ${membershipId} LIMIT 1
  `
  if (memberRows[0]?.phone) {
    if (completed) {
      notify(memberRows[0].phone, staff.companyId, 'stamp_complete', {
        rewardText: card.reward_text,
        voucherCode: voucherCode ?? undefined,
      }).catch(() => {})
    }
  }

  return NextResponse.json({
    success: true,
    count: completed ? card.goal : newCount,
    goal: card.goal,
    completed,
    voucherCode,
    rewardText: card.reward_text,
    accent_color: card.accent_color || '#F59E0B',
    stamp_icon: card.stamp_icon || '★',
    card_bg: card.card_bg || 'white',
    message,
  })
}
