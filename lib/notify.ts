import { sql } from '@/lib/db'

type NotifType = 'welcome' | 'points_earned' | 'stamp_complete' | 'voucher_created' | 'expiry_warning'

interface NotifData {
  companyName?: string
  points?:      number
  balance?:     number
  stampCount?:  number
  stampGoal?:   number
  rewardText?:  string
  voucherCode?: string
  voucherDesc?: string
  expiryDays?:  number
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('60'))   return '+' + digits
  if (digits.startsWith('0'))    return '+6' + digits
  if (digits.startsWith('+'))    return phone.replace(/\s/g, '')
  return '+' + digits
}

function buildMessage(type: NotifType, data: NotifData): string {
  const name = data.companyName || 'us'
  switch (type) {
    case 'welcome':
      return `Welcome to ${name} Loyalty! 🎉 You're now registered. Start earning points with every visit.`
    case 'points_earned':
      return `+${data.points} points earned at ${name}! 🌟 Your balance: ${data.balance} pts.`
    case 'stamp_complete':
      return `🎊 Stamp card complete at ${name}! Your reward: ${data.rewardText}. Show voucher code *${data.voucherCode}* to staff.`
    case 'voucher_created':
      return `🎁 Reward ready at ${name}! Voucher: *${data.voucherCode}* — ${data.voucherDesc}. Show this to staff to redeem.`
    case 'expiry_warning':
      return `⚠️ Reminder: your points at ${name} expire in ${data.expiryDays} days. Visit us to keep earning!`
    default:
      return ''
  }
}

async function sendTwilio(to: string, from: string, body: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  const auth  = Buffer.from(`${sid}:${token}`).toString('base64')
  const res   = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:  'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[notify] Twilio error:', err)
  }
}

export async function notify(
  phone:     string,
  companyId: string,
  type:      NotifType,
  data:      NotifData = {},
): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return

  const db = sql()
  const [settingsRows, companyRows] = await Promise.all([
    db`SELECT data FROM settings WHERE company_id = ${companyId} LIMIT 1`,
    db`SELECT name FROM companies WHERE id = ${companyId} LIMIT 1`,
  ])
  const settings: Record<string, any> = settingsRows[0]?.data || {}

  // Default: all notifications ON. Admin can turn each off.
  if (settings[`notif_${type}`] === false) return

  const channel = (settings.notif_channel as string) || 'whatsapp'
  const message = buildMessage(type, { ...data, companyName: data.companyName || companyRows[0]?.name || '' })
  if (!message) return

  const e164 = toE164(phone)

  try {
    if ((channel === 'whatsapp' || channel === 'both') && process.env.TWILIO_WHATSAPP_FROM) {
      await sendTwilio(`whatsapp:${e164}`, process.env.TWILIO_WHATSAPP_FROM, message)
    }
    if ((channel === 'sms' || channel === 'both') && process.env.TWILIO_SMS_FROM) {
      await sendTwilio(e164, process.env.TWILIO_SMS_FROM, message)
    }
  } catch (err) {
    console.error('[notify] send error:', err)
  }
}
