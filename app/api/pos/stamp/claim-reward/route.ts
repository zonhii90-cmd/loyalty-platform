import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateStaff, staffUnauthorized } from '@/lib/staffAuth'

export async function POST(req: NextRequest) {
  const staff = await validateStaff(req)
  if (!staff) return staffUnauthorized()

  const { membershipId } = await req.json()
  if (!membershipId) {
    return NextResponse.json({ error: 'membershipId required' }, { status: 400 })
  }

  const db = sql()

  const msRows = await db`
    SELECT id FROM memberships
    WHERE id = ${membershipId} AND company_id = ${staff.companyId}
    LIMIT 1
  `
  if (!msRows[0]) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

  const stampRows = await db`
    SELECT ms.id, ms.count, sc.goal, sc.reward_text, sc.id as card_id
    FROM member_stamps ms
    JOIN stamp_cards sc ON sc.id = ms.stamp_card_id
    WHERE ms.membership_id = ${membershipId}
      AND sc.active = true
      AND sc.company_id = ${staff.companyId}
    LIMIT 1
  `
  if (!stampRows[0]) return NextResponse.json({ error: 'No stamp card found' }, { status: 404 })

  const stamp = stampRows[0]
  if (Number(stamp.count) < Number(stamp.goal)) {
    return NextResponse.json({ error: 'Stamp card is not yet complete' }, { status: 400 })
  }

  // Reset count to 0 so customer screen knows a new card has started
  await db`UPDATE member_stamps SET count = 0, updated_at = now() WHERE id = ${stamp.id}`

  // Mark the oldest unredeemed stamp voucher as claimed
  await db`
    UPDATE vouchers SET redeemed_at = now()
    WHERE id = (
      SELECT id FROM vouchers
      WHERE membership_id = ${membershipId}
        AND stamp_card_id = ${stamp.card_id}
        AND type = 'stamp'
        AND redeemed_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    )
  `

  // Ledger record for history (amount 0 = physical reward, no points change)
  try {
    await db`
      INSERT INTO points_ledger (membership_id, type, amount, source, note)
      VALUES (${membershipId}, 'earn', 0, 'stamp_claim', ${'Reward claimed: ' + stamp.reward_text})
    `
  } catch {
    // Non-fatal: ledger entry is nice-to-have; don't fail the claim if it errors
  }

  return NextResponse.json({ success: true, rewardText: stamp.reward_text })
}
