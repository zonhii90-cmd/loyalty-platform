import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { toE164 } from '@/lib/kapso'

export async function POST(req: NextRequest) {
  const { phone, slug, code } = await req.json()
  if (!phone?.trim() || !slug?.trim() || !code?.trim()) {
    return NextResponse.json({ error: 'phone, slug, and code required' }, { status: 400 })
  }

  const db = sql()
  const companyRows = await db`SELECT id FROM companies WHERE slug = ${slug} LIMIT 1`
  if (!companyRows[0]) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  const companyId = companyRows[0].id

  const e164 = toE164(phone.trim())

  const rows = await db`
    SELECT id FROM otp_codes
    WHERE phone = ${e164}
      AND company_id = ${companyId}
      AND code = ${code.trim()}
      AND used = false
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (!rows[0]) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  await db`UPDATE otp_codes SET used = true WHERE id = ${rows[0].id}`

  return NextResponse.json({ success: true })
}
