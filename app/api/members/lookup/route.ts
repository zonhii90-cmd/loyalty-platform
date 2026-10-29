import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { phone, company_id, name } = await req.json()
  if (!phone?.trim() || !company_id?.trim()) {
    return NextResponse.json({ error: 'phone and company_id required' }, { status: 400 })
  }

  const normalised = phone.trim().replace(/\s+/g, '')
  const db = sql()

  // Find or create member
  let member: any
  const existing = await db`SELECT * FROM members WHERE phone = ${normalised} LIMIT 1`
  if (existing[0]) {
    member = existing[0]
  } else {
    const created = await db`
      INSERT INTO members (phone, name) VALUES (${normalised}, ${name?.trim() || null})
      RETURNING *
    `
    member = created[0]
  }

  // Find or create membership
  let membership: any
  let isNew = false
  const existingMs = await db`
    SELECT * FROM memberships WHERE member_id = ${member.id} AND company_id = ${company_id} LIMIT 1
  `
  if (existingMs[0]) {
    membership = existingMs[0]
  } else {
    const created = await db`
      INSERT INTO memberships (member_id, company_id) VALUES (${member.id}, ${company_id})
      RETURNING *
    `
    membership = created[0]
    isNew = true
  }

  return NextResponse.json({ member, membership, isNew })
}
