import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendKapso, toE164 } from '@/lib/kapso'

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(req: NextRequest) {
  const { phone, slug } = await req.json()
  if (!phone?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: 'phone and slug required' }, { status: 400 })
  }

  const db = sql()
  const companyRows = await db`SELECT id, name FROM companies WHERE slug = ${slug} AND require_phone_otp = true LIMIT 1`
  if (!companyRows[0]) {
    return NextResponse.json({ error: 'OTP not required for this program' }, { status: 400 })
  }
  const { id: companyId, name: companyName } = companyRows[0]

  const e164 = toE164(phone.trim())
  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Invalidate previous unused OTPs for this phone+company
  await db`
    UPDATE otp_codes SET used = true
    WHERE phone = ${e164} AND company_id = ${companyId} AND used = false
  `

  // Store new OTP
  await db`
    INSERT INTO otp_codes (phone, company_id, code, expires_at)
    VALUES (${e164}, ${companyId}, ${code}, ${expiresAt})
  `

  if (process.env.KAPSO_API_KEY && process.env.KAPSO_PHONE_NUMBER_ID) {
    await sendKapso(e164, `Your ${companyName} verification code is: *${code}*\n\nThis code expires in 10 minutes.`)
  }

  return NextResponse.json({ success: true })
}
