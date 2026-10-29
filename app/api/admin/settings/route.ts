import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db = sql()
  const rows = await db`
    SELECT data FROM settings WHERE company_id = ${auth.companyId} LIMIT 1
  `
  return NextResponse.json({ settings: rows[0]?.data || {} })
}

export async function PUT(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const body = await req.json()
  const db = sql()

  await db`
    INSERT INTO settings (id, company_id, data, updated_at)
    VALUES (${auth.companyId}, ${auth.companyId}, ${JSON.stringify(body)}, now())
    ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(body)}, updated_at = now()
  `
  return NextResponse.json({ success: true })
}
