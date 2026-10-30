import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

type Segment = 'all' | 'new' | 'active' | 'at_risk' | 'lapsed'

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('60')) return '+' + digits
  if (digits.startsWith('0'))  return '+6' + digits
  if (digits.startsWith('+'))  return phone.replace(/\s/g, '')
  return '+' + digits
}

async function sendTwilio(to: string, from: string, body: string): Promise<boolean> {
  const sid   = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  const auth  = Buffer.from(`${sid}:${token}`).toString('base64')
  const res   = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:  'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  })
  return res.ok
}

function buildFilter(db: ReturnType<typeof sql>, segment: Segment) {
  switch (segment) {
    case 'new':     return db`AND ms.joined_at > now() - interval '14 days'`
    case 'active':  return db`AND ms.last_activity_at > now() - interval '30 days'`
    case 'at_risk': return db`AND ms.last_activity_at BETWEEN now() - interval '90 days' AND now() - interval '30 days' AND ms.points > 0`
    case 'lapsed':  return db`AND (ms.last_activity_at < now() - interval '90 days' OR ms.last_activity_at IS NULL) AND ms.points > 0`
    default:        return db``
  }
}

// GET — estimate recipient count for a segment
export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const segment = (req.nextUrl.searchParams.get('segment') || 'all') as Segment
  const db = sql()
  const filter = buildFilter(db, segment)

  const rows = await db`
    SELECT COUNT(*) AS total
    FROM memberships ms
    JOIN members m ON m.id = ms.member_id
    WHERE ms.company_id = ${auth.companyId} ${filter}
  `
  return NextResponse.json({ total: parseInt(rows[0].total as string) })
}

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const { message, segment = 'all' } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 })
  }

  const db = sql()
  const filter = buildFilter(db, segment as Segment)

  const [settingsRows, companyRows, members] = await Promise.all([
    db`SELECT data FROM settings WHERE id = ${auth.companyId} LIMIT 1`,
    db`SELECT name FROM companies WHERE id = ${auth.companyId} LIMIT 1`,
    db`
      SELECT DISTINCT m.phone
      FROM memberships ms
      JOIN members m ON m.id = ms.member_id
      WHERE ms.company_id = ${auth.companyId} ${filter}
      LIMIT 500
    `,
  ])

  const settings      = settingsRows[0]?.data || {}
  const companyName   = companyRows[0]?.name  || ''
  const channel       = (settings.notif_channel as string) || 'whatsapp'
  const whatsappFrom  = process.env.TWILIO_WHATSAPP_FROM
  const smsFrom       = process.env.TWILIO_SMS_FROM
  const text          = message.trim().replace(/\{company\}/g, companyName)

  let sent = 0, failed = 0
  for (const row of members) {
    const e164 = toE164(row.phone as string)
    try {
      if ((channel === 'whatsapp' || channel === 'both') && whatsappFrom) {
        const ok = await sendTwilio(`whatsapp:${e164}`, whatsappFrom, text)
        ok ? sent++ : failed++
      } else if (smsFrom) {
        const ok = await sendTwilio(e164, smsFrom, text)
        ok ? sent++ : failed++
      }
    } catch {
      failed++
    }
  }

  return NextResponse.json({ sent, failed, total: members.length })
}
