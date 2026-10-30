import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: membershipId } = await params

  const db = sql()
  const rows = await db`
    SELECT v.id, v.code, v.type, v.description, v.expires_at, v.redeemed_at, v.created_at
    FROM vouchers v
    WHERE v.membership_id = ${membershipId}
    ORDER BY v.created_at DESC
    LIMIT 50
  `
  return NextResponse.json({ vouchers: rows })
}
