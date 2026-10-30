import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()

  const { current, newPassword } = await req.json()
  if (!current || !newPassword) return NextResponse.json({ error: 'current and newPassword required' }, { status: 400 })
  if (newPassword.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

  const db = sql()
  const rows = await db`SELECT password FROM companies WHERE id = ${auth.companyId} LIMIT 1`
  if (!rows[0] || rows[0].password !== current) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 })
  }

  await db`UPDATE companies SET password = ${newPassword} WHERE id = ${auth.companyId}`
  return NextResponse.json({ success: true })
}
