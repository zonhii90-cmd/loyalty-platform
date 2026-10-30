import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'
import { validateStaff } from '@/lib/staffAuth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  // Accept either admin or staff auth
  const admin = await validateAdmin(req)
  const staff = admin ? null : await validateStaff(req)
  if (!admin && !staff) return unauthorized()
  const companyId = admin ? admin.companyId : staff!.companyId
  const staffId   = staff ? staff.staffId : null

  const db = sql()
  const rows = await db`
    SELECT v.*, m2.company_id as ms_company_id
    FROM vouchers v
    JOIN memberships m2 ON m2.id = v.membership_id
    WHERE UPPER(v.code) = UPPER(${code})
    LIMIT 1
  `
  const voucher = rows[0]
  if (!voucher) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })
  if (voucher.ms_company_id !== companyId) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })
  if (voucher.redeemed_at) return NextResponse.json({ error: 'Voucher already redeemed' }, { status: 409 })
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Voucher expired' }, { status: 410 })
  }

  await db`
    UPDATE vouchers
    SET redeemed_at = now(), redeemed_by = ${staffId}
    WHERE id = ${voucher.id}
  `
  return NextResponse.json({
    success: true,
    voucher: { code: voucher.code, type: voucher.type, description: voucher.description },
  })
}
