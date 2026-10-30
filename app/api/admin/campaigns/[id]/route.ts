import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { id } = await params
  const body = await req.json()
  const db = sql()
  await db`
    UPDATE campaigns
    SET name       = COALESCE(${body.name       ?? null}, name),
        multiplier = COALESCE(${body.multiplier ?? null}, multiplier),
        starts_at  = COALESCE(${body.starts_at  ?? null}, starts_at),
        ends_at    = COALESCE(${body.ends_at    ?? null}, ends_at),
        active     = COALESCE(${body.active     ?? null}, active)
    WHERE id = ${id} AND company_id = ${auth.companyId}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { id } = await params
  const db = sql()
  await db`DELETE FROM campaigns WHERE id = ${id} AND company_id = ${auth.companyId}`
  return NextResponse.json({ ok: true })
}
