import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Public endpoint — membership UUID is the capability token
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, birthday } = await req.json()

  // Validate birthday format (YYYY-MM-DD) if provided
  if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    return NextResponse.json({ error: 'birthday must be YYYY-MM-DD' }, { status: 400 })
  }

  const db = sql()

  // Resolve membership → member
  const msRow = await db`SELECT member_id FROM memberships WHERE id = ${id} LIMIT 1`
  if (!msRow[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db`
    UPDATE members
    SET name     = COALESCE(${name?.trim() || null}, name),
        birthday = COALESCE(${birthday || null}::date, birthday)
    WHERE id = ${msRow[0].member_id}
  `

  return NextResponse.json({ ok: true })
}
