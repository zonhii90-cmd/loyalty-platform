import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const db = sql()
  const rows = await db`
    SELECT * FROM campaigns WHERE company_id = ${auth.companyId}
    ORDER BY starts_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { name, multiplier, starts_at, ends_at } = await req.json()
  if (!name || !multiplier || !starts_at || !ends_at)
    return NextResponse.json({ error: 'name, multiplier, starts_at, ends_at required' }, { status: 400 })
  const db = sql()
  const row = await db`
    INSERT INTO campaigns (company_id, name, multiplier, starts_at, ends_at)
    VALUES (${auth.companyId}, ${name}, ${multiplier}, ${starts_at}, ${ends_at})
    RETURNING *
  `
  return NextResponse.json(row[0])
}
