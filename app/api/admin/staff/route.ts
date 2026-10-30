import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'
import { createPinHash } from '@/lib/staffAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db = sql()
  const rows = await db`
    SELECT s.id, s.name, s.role, s.active, s.created_at,
           s.branch_id, b.name AS branch_name
    FROM staff s
    LEFT JOIN branches b ON b.id = s.branch_id
    WHERE s.company_id = ${auth.companyId}
    ORDER BY s.created_at ASC
  `
  return NextResponse.json({ staff: rows })
}

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const { name, pin, role, branch_id } = await req.json()
  if (!name?.trim() || !pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'name and 4-digit PIN required' }, { status: 400 })
  }
  if (role && !['manager', 'cashier'].includes(role)) {
    return NextResponse.json({ error: 'role must be manager or cashier' }, { status: 400 })
  }

  const pinHash = await createPinHash(pin)
  const db = sql()
  const rows = await db`
    INSERT INTO staff (company_id, name, pin, role, branch_id)
    VALUES (${auth.companyId}, ${name.trim()}, ${pinHash}, ${role || 'cashier'}, ${branch_id || null})
    RETURNING id, name, role, active, created_at, branch_id
  `
  return NextResponse.json({ staff: rows[0] }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = sql()
  await db`
    UPDATE staff SET active = false WHERE id = ${id} AND company_id = ${auth.companyId}
  `
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const { id, pin } = await req.json()
  if (!id || !pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'id and 4-digit PIN required' }, { status: 400 })
  }

  const pinHash = await createPinHash(pin)
  const db = sql()
  await db`
    UPDATE staff SET pin = ${pinHash} WHERE id = ${id} AND company_id = ${auth.companyId}
  `
  return NextResponse.json({ success: true })
}
