import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  const db = sql()
  const rows = await db`
    SELECT id, name, description, points_cost, validity_days
    FROM rewards
    WHERE company_id = ${companyId} AND active = true
    ORDER BY points_cost ASC
  `
  return NextResponse.json({ rewards: rows })
}
