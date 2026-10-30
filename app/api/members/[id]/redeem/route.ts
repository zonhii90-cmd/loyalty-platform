import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { notify } from '@/lib/notify'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: membershipId } = await params
  const { rewardId } = await req.json()
  if (!rewardId) return NextResponse.json({ error: 'rewardId required' }, { status: 400 })

  const db = sql()

  const msRows = await db`SELECT * FROM memberships WHERE id = ${membershipId} LIMIT 1`
  if (!msRows[0]) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  const membership = msRows[0]

  const rewardRows = await db`
    SELECT * FROM rewards
    WHERE id = ${rewardId} AND company_id = ${membership.company_id} AND active = true
    LIMIT 1
  `
  if (!rewardRows[0]) return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
  const reward = rewardRows[0]

  if (membership.points < reward.points_cost) {
    return NextResponse.json({ error: `Not enough points. Need ${reward.points_cost}, have ${membership.points}` }, { status: 400 })
  }

  const newBalance = membership.points - reward.points_cost
  const code       = generateCode()
  const expires    = new Date(Date.now() + (reward.validity_days || 30) * 24 * 60 * 60 * 1000)

  await db`
    INSERT INTO points_ledger (membership_id, type, amount, source, note)
    VALUES (${membershipId}, 'redeem', ${-reward.points_cost}, 'reward', ${`Redeemed: ${reward.name}`})
  `
  await db`UPDATE memberships SET points = ${newBalance}, last_activity_at = now() WHERE id = ${membershipId}`

  const voucherRows = await db`
    INSERT INTO vouchers (membership_id, reward_id, code, type, description, expires_at)
    VALUES (${membershipId}, ${rewardId}, ${code}, 'reward', ${reward.name}, ${expires.toISOString()})
    RETURNING *
  `

  // Fetch member phone for notification
  const memberRows = await db`
    SELECT m.phone FROM memberships ms JOIN members m ON m.id = ms.member_id
    WHERE ms.id = ${membershipId} LIMIT 1
  `
  if (memberRows[0]?.phone) {
    notify(memberRows[0].phone, membership.company_id, 'voucher_created', {
      voucherCode: code,
      voucherDesc: reward.name,
    }).catch(() => {})
  }

  return NextResponse.json({
    success: true,
    voucher: { code, description: reward.name, expiresAt: expires },
    newBalance,
    pointsSpent: reward.points_cost,
  })
}
