import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth || !auth.isSuperAdmin) return unauthorized()

  const db = sql()
  const rows = await db`
    SELECT id, name, email, created_at FROM companies
    WHERE id != 'super'
    ORDER BY created_at DESC
  `
  return NextResponse.json({ companies: rows })
}

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth || !auth.isSuperAdmin) return unauthorized()

  const { id, name, password, email } = await req.json()
  if (!id?.trim() || !name?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'id, name, password required' }, { status: 400 })
  }

  const companyId = id.trim().toLowerCase().replace(/\s+/g, '-')
  const db = sql()
  try {
    await db`
      INSERT INTO companies (id, name, password, email)
      VALUES (${companyId}, ${name.trim()}, ${password.trim()}, ${email?.trim() || null})
    `
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth || !auth.isSuperAdmin) return unauthorized()

  const id = req.nextUrl.searchParams.get('id')
  if (!id || id === 'super') return NextResponse.json({ error: 'Cannot delete super' }, { status: 400 })

  const db = sql()
  await db`DELETE FROM companies WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
