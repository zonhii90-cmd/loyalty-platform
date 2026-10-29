import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const { membership_id, type, amount, note, created_by } = await req.json()
  if (!membership_id || !type || typeof amount !== 'number' || amount === 0) {
    return NextResponse.json({ error: 'membership_id, type, and non-zero amount required' }, { status: 400 })
  }
  if (!['earn', 'redeem', 'adjust'].includes(type)) {
    return NextResponse.json({ error: 'type must be earn | redeem | adjust' }, { status: 400 })
  }

  const db = sql()
  const msRows = await db`
    SELECT id, points FROM memberships
    WHERE id = ${membership_id} AND company_id = ${auth.companyId}
    LIMIT 1
  `
  if (!msRows[0]) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

  const newBalance = msRows[0].points + amount
  if (newBalance < 0) return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })

  await db`
    INSERT INTO points_ledger (membership_id, type, amount, source, note, created_by)
    VALUES (${membership_id}, ${type}, ${amount}, 'manual', ${note?.trim() || null}, ${created_by?.trim() || auth.companyId})
  `
  await db`
    UPDATE memberships SET points = ${newBalance} WHERE id = ${membership_id}
  `
  return NextResponse.json({ success: true, points: newBalance })
}
