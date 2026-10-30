export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('60')) return '+' + digits
  if (digits.startsWith('0'))  return '+6' + digits
  if (digits.startsWith('+'))  return phone.replace(/\s/g, '')
  return '+' + digits
}

export async function sendKapso(to: string, body: string): Promise<boolean> {
  const apiKey     = process.env.KAPSO_API_KEY!
  const phoneNumId = process.env.KAPSO_PHONE_NUMBER_ID!
  const res = await fetch(`https://api.kapso.ai/meta/whatsapp/${phoneNumId}/messages`, {
    method:  'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  })
  if (!res.ok) console.error('[kapso] error:', await res.text())
  return res.ok
}
