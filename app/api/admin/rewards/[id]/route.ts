import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { id } = await params

  const { name, description, points_cost, validity_days, active } = await req.json()
  if (!name?.trim() || !points_cost || points_cost < 1) {
    return NextResponse.json({ error: 'name and points_cost required' }, { status: 400 })
  }

  const db = sql()
  const rows = await db`
    UPDATE rewards
    SET name = ${name.trim()}, description = ${description?.trim() || null},
        points_cost = ${points_cost}, validity_days = ${validity_days || 30},
        active = ${active ?? true}
    WHERE id = ${id} AND company_id = ${auth.companyId}
    RETURNING *
  `
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ reward: rows[0] })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { id } = await params

  const db = sql()
  await db`UPDATE rewards SET active = false WHERE id = ${id} AND company_id = ${auth.companyId}`
  return NextResponse.json({ success: true })
}
