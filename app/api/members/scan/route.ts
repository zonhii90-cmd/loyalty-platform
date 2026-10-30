import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { token, phone, name } = await req.json()
  if (!token || !phone?.trim()) {
    return NextResponse.json({ error: 'token and phone required' }, { status: 400 })
  }

  const normalised = phone.trim().replace(/\s+/g, '')
  const db = sql()

  // Validate token
  const tokenRows = await db`
    SELECT * FROM qr_tokens WHERE id = ${token} LIMIT 1
  `
  const qt = tokenRows[0]
  if (!qt)                            return NextResponse.json({ error: 'Invalid QR code' }, { status: 404 })
  if (qt.used_at)                     return NextResponse.json({ error: 'QR code already used' }, { status: 409 })
  if (new Date(qt.expires_at) < new Date()) return NextResponse.json({ error: 'QR code expired' }, { status: 410 })

  // Find or create member + membership
  let member: any
  const existingMember = await db`SELECT * FROM members WHERE phone = ${normalised} LIMIT 1`
  if (existingMember[0]) {
    member = existingMember[0]
    if (name?.trim() && !member.name) {
      await db`UPDATE members SET name = ${name.trim()} WHERE id = ${member.id}`
      member.name = name.trim()
    }
  } else {
    const created = await db`
      INSERT INTO members (phone, name) VALUES (${normalised}, ${name?.trim() || null})
      RETURNING *
    `
    member = created[0]
  }

  let membership: any
  let isNew = false
  const existingMs = await db`
    SELECT * FROM memberships WHERE member_id = ${member.id} AND company_id = ${qt.company_id} LIMIT 1
  `
  if (existingMs[0]) {
    membership = existingMs[0]
  } else {
    const created = await db`
      INSERT INTO memberships (member_id, company_id)
      VALUES (${member.id}, ${qt.company_id})
      RETURNING *
    `
    membership = created[0]
    isNew = true
  }

  const newBalance = membership.points + qt.points

  // Credit points + update last_activity_at
  await db`
    INSERT INTO points_ledger (membership_id, type, amount, source, note, staff_id)
    VALUES (${membership.id}, 'earn', ${qt.points}, 'qr_scan', ${'QR scan'}, ${qt.staff_id || null})
  `
  await db`
    UPDATE memberships
    SET points = ${newBalance}, last_activity_at = now()
    WHERE id = ${membership.id}
  `

  // Add stamp if company has active QR-mode stamp card
  let stampResult: { completed: boolean; count: number; goal: number; rewardText: string } | null = null
  const stampCardRows = await db`
    SELECT * FROM stamp_cards
    WHERE company_id = ${qt.company_id} AND active = true AND earn_mode = 'qr'
    LIMIT 1
  `
  if (stampCardRows[0]) {
    const card = stampCardRows[0]
    const existingStamp = await db`
      SELECT * FROM member_stamps WHERE membership_id = ${membership.id} AND stamp_card_id = ${card.id} LIMIT 1
    `
    let stampRow: any
    if (existingStamp[0]) {
      stampRow = existingStamp[0]
    } else {
      const created = await db`
        INSERT INTO member_stamps (membership_id, stamp_card_id) VALUES (${membership.id}, ${card.id})
        RETURNING *
      `
      stampRow = created[0]
    }

    const newCount = stampRow.count + 1
    const completed = newCount >= card.goal

    if (completed) {
      // Complete card: reset count, increment completed_count, generate voucher
      const code = generateCode()
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await db`
        UPDATE member_stamps
        SET count = 0, completed_count = completed_count + 1, updated_at = now()
        WHERE id = ${stampRow.id}
      `
      await db`
        INSERT INTO vouchers (membership_id, stamp_card_id, code, type, description, expires_at)
        VALUES (${membership.id}, ${card.id}, ${code}, 'stamp', ${card.reward_text}, ${expires.toISOString()})
      `
      stampResult = { completed: true, count: 0, goal: card.goal, rewardText: card.reward_text }
    } else {
      await db`
        UPDATE member_stamps SET count = ${newCount}, updated_at = now() WHERE id = ${stampRow.id}
      `
      stampResult = { completed: false, count: newCount, goal: card.goal, rewardText: card.reward_text }
    }
  }

  // Mark token used
  await db`
    UPDATE qr_tokens SET used_at = now(), used_by = ${membership.id} WHERE id = ${token}
  `

  return NextResponse.json({
    success: true,
    points: qt.points,
    balance: newBalance,
    isNew,
    stamp: stampResult,
  })
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
