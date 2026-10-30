import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Public endpoint — returns only safe display settings for a company
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = sql()
  const rows = await db`SELECT data FROM settings WHERE id = ${id} LIMIT 1`
  if (!rows[0]) return NextResponse.json({ pointsValue: null })

  const data = rows[0].data || {}
  return NextResponse.json({
    pointsValue: data.pointsValue ? parseFloat(data.pointsValue) : null,
  })
}
