import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Public endpoint — membership UUID is unguessable capability token
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = sql()
  const ledger = await db`
    SELECT id, type, amount, source, note, created_at
    FROM points_ledger
    WHERE membership_id = ${id}
    ORDER BY created_at DESC
    LIMIT 50
  `
  return NextResponse.json({ ledger }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
