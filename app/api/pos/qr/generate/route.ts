import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateStaff, staffUnauthorized } from '@/lib/staffAuth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://loyalty-platform-beta-ebon.vercel.app'
const TTL_MINUTES = 5

export async function POST(req: NextRequest) {
  const staff = await validateStaff(req)
  if (!staff) return staffUnauthorized()

  const { earnType, points: fixedPoints, amount } = await req.json()
  if (!earnType || !['fixed', 'purchase'].includes(earnType)) {
    return NextResponse.json({ error: 'earnType must be fixed or purchase' }, { status: 400 })
  }

  const db = sql()

  // Calculate points
  let pointsToAward: number
  if (earnType === 'fixed') {
    if (!fixedPoints || fixedPoints <= 0) return NextResponse.json({ error: 'points required' }, { status: 400 })
    pointsToAward = Math.floor(fixedPoints)
  } else {
    if (!amount || amount <= 0) return NextResponse.json({ error: 'amount required' }, { status: 400 })
    // Look up company's points rate from settings
    const settingsRows = await db`SELECT data FROM settings WHERE company_id = ${staff.companyId} LIMIT 1`
    const settings = settingsRows[0]?.data || {}
    const rate = Number(settings.pointsPerRinggit || settings.pointsPerAmount || 1)
    pointsToAward = Math.max(1, Math.floor(amount * rate))
  }

  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000)

  const rows = await db`
    INSERT INTO qr_tokens (company_id, staff_id, earn_type, points, amount, expires_at)
    VALUES (${staff.companyId}, ${staff.staffId}, ${earnType}, ${pointsToAward}, ${amount || null}, ${expiresAt.toISOString()})
    RETURNING id
  `
  const tokenId = rows[0].id
  const scanUrl = `${APP_URL}/scan?t=${tokenId}`
  const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(scanUrl)}`

  return NextResponse.json({ tokenId, scanUrl, qrUrl, points: pointsToAward, expiresAt })
}
