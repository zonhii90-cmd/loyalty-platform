import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { id } = await params
  const { name, location, active } = await req.json()
  const db = sql()
  await db`
    UPDATE branches
    SET name     = COALESCE(${name     ?? null}, name),
        location = COALESCE(${location ?? null}, location),
        active   = COALESCE(${active   ?? null}, active)
    WHERE id = ${id} AND company_id = ${auth.companyId}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { id } = await params
  const db = sql()
  // Unassign staff from this branch before deleting
  await db`UPDATE staff SET branch_id = NULL WHERE branch_id = ${id} AND company_id = ${auth.companyId}`
  await db`DELETE FROM branches WHERE id = ${id} AND company_id = ${auth.companyId}`
  return NextResponse.json({ ok: true })
}
