import { sql } from '@/lib/db'
import { toE164, sendKapso } from '@/lib/kapso'

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

export async function notify(
  phone:     string,
  companyId: string,
  type:      NotifType,
  data:      NotifData = {},
): Promise<void> {
  if (!process.env.KAPSO_API_KEY || !process.env.KAPSO_PHONE_NUMBER_ID) return

  const db = sql()
  const [settingsRows, companyRows] = await Promise.all([
    db`SELECT data FROM settings WHERE id = ${companyId} LIMIT 1`,
    db`SELECT name FROM companies WHERE id = ${companyId} LIMIT 1`,
  ])
  const settings: Record<string, any> = settingsRows[0]?.data || {}

  // Default: all notifications ON. Admin can turn each off.
  if (settings[`notif_${type}`] === false) return

  const message = buildMessage(type, { ...data, companyName: data.companyName || companyRows[0]?.name || '' })
  if (!message) return

  const e164 = toE164(phone)

  try {
    await sendKapso(e164, message)
  } catch (err) {
    console.error('[notify] send error:', err)
  }
}
