import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const { id } = await params
  const db = sql()

  const [msRows, ledger, vouchers] = await Promise.all([
    db`
      SELECT ms.*, m.name, m.phone, m.birthday
      FROM memberships ms
      JOIN members m ON m.id = ms.member_id
      WHERE ms.id = ${id} AND ms.company_id = ${auth.companyId}
      LIMIT 1
    `,
    db`
      SELECT * FROM points_ledger
      WHERE membership_id = ${id}
      ORDER BY created_at DESC
      LIMIT 100
    `,
    db`
      SELECT * FROM vouchers
      WHERE membership_id = ${id}
      ORDER BY created_at DESC
    `,
  ])

  if (!msRows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ member: msRows[0], ledger, vouchers })
}
