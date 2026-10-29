import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { id } = await params

  const db = sql()
  const rows = await db`
    SELECT
      ms.id, ms.points, ms.tier, ms.joined_at,
      m.id AS member_id, m.phone, m.name, m.birthday
    FROM memberships ms
    JOIN members m ON m.id = ms.member_id
    WHERE ms.id = ${id} AND ms.company_id = ${auth.companyId}
    LIMIT 1
  `
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const r = rows[0]
  const membership = {
    id: r.id, points: r.points, tier: r.tier, joined_at: r.joined_at,
    member: { id: r.member_id, phone: r.phone, name: r.name, birthday: r.birthday },
  }

  const ledger = await db`
    SELECT id, type, amount, source, note, created_by, created_at
    FROM points_ledger
    WHERE membership_id = ${id}
    ORDER BY created_at DESC
    LIMIT 100
  `
  return NextResponse.json({ membership, ledger })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { id } = await params

  const db = sql()
  const msRows = await db`
    SELECT member_id FROM memberships
    WHERE id = ${id} AND company_id = ${auth.companyId}
    LIMIT 1
  `
  if (!msRows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, birthday } = await req.json()
  await db`
    UPDATE members SET
      name     = COALESCE(${name     ?? null}, name),
      birthday = COALESCE(${birthday ?? null}, birthday)
    WHERE id = ${msRows[0].member_id}
  `
  return NextResponse.json({ success: true })
}
