import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'
import { notify } from '@/lib/notify'

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 503 })
  }

  const { phone } = await req.json()
  if (!phone?.trim()) return NextResponse.json({ error: 'phone required' }, { status: 400 })

  try {
    await notify(phone.trim(), auth.companyId, 'welcome')
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send' }, { status: 500 })
  }
}
