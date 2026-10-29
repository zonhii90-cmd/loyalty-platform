import { NextRequest, NextResponse } from 'next/server'
import { sql } from './db'

export interface AdminAuth {
  companyId: string
  isSuperAdmin: boolean
}

export async function validateAdmin(req: NextRequest): Promise<AdminAuth | null> {
  const token     = req.headers.get('x-admin-token') || ''
  const companyId = req.headers.get('x-company-id')  || ''
  if (!token || !companyId) return null

  const db = sql()
  const rows = await db`
    SELECT id, password FROM companies WHERE id = ${companyId} LIMIT 1
  `
  const company = rows[0]
  if (!company || company.password !== token) return null
  return { companyId, isSuperAdmin: companyId === 'super' }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
