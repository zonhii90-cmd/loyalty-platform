import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const db = sql()
  const rows = await db`
    SELECT * FROM rewards WHERE company_id = ${auth.companyId} ORDER BY points_cost ASC
  `
  return NextResponse.json({ rewards: rows })
}

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const { name, description, points_cost, validity_days, min_tier } = await req.json()
  if (!name?.trim() || !points_cost || points_cost < 1) {
    return NextResponse.json({ error: 'name and points_cost (min 1) required' }, { status: 400 })
  }

  const tier = ['bronze', 'silver', 'gold'].includes(min_tier) ? min_tier : 'bronze'
  const db = sql()
  const rows = await db`
    INSERT INTO rewards (company_id, name, description, points_cost, validity_days, min_tier, active)
    VALUES (${auth.companyId}, ${name.trim()}, ${description?.trim() || null}, ${points_cost}, ${validity_days || 30}, ${tier}, true)
    RETURNING *
  `
  return NextResponse.json({ reward: rows[0] }, { status: 201 })
}
