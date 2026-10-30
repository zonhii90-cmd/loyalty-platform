import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { notify } from '@/lib/notify'

export async function POST(req: NextRequest) {
  const { phone, company_id, slug, name } = await req.json()
  if (!phone?.trim() || (!company_id?.trim() && !slug?.trim())) {
    return NextResponse.json({ error: 'phone and company_id (or slug) required' }, { status: 400 })
  }

  const normalised = phone.trim().replace(/\s+/g, '')
  const db = sql()

  // Resolve slug to company_id if needed
  let resolvedCompanyId = company_id?.trim()
  if (!resolvedCompanyId && slug) {
    const cRows = await db`SELECT id FROM companies WHERE slug = ${slug.trim()} LIMIT 1`
    if (!cRows[0]) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    resolvedCompanyId = cRows[0].id
  }
  const company_id_final = resolvedCompanyId

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
    SELECT * FROM memberships WHERE member_id = ${member.id} AND company_id = ${company_id_final} LIMIT 1
  `
  if (existingMs[0]) {
    membership = existingMs[0]
  } else {
    const created = await db`
      INSERT INTO memberships (member_id, company_id) VALUES (${member.id}, ${company_id_final})
      RETURNING *
    `
    membership = created[0]
    isNew = true
  }

  if (isNew) {
    notify(normalised, company_id_final, 'welcome').catch(() => {})
  }

  return NextResponse.json({ member, membership, isNew })
}
