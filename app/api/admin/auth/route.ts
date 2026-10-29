import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { companyId, password } = await req.json()
  if (!companyId || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = sql()
  const rows = await db`
    SELECT id, name, password FROM companies WHERE id = ${companyId} LIMIT 1
  `
  const company = rows[0]
  if (!company || company.password !== password) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  return NextResponse.json({ companyId: company.id, companyName: company.name, token: company.password })
}
