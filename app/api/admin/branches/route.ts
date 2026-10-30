import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const db = sql()
  const rows = await db`
    SELECT b.*, COUNT(s.id) AS staff_count
    FROM branches b
    LEFT JOIN staff s ON s.branch_id = b.id AND s.active = true
    WHERE b.company_id = ${auth.companyId}
    GROUP BY b.id
    ORDER BY b.name
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { name, location } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const db = sql()
  const row = await db`
    INSERT INTO branches (company_id, name, location)
    VALUES (${auth.companyId}, ${name.trim()}, ${location?.trim() || null})
    RETURNING *
  `
  return NextResponse.json(row[0])
}
