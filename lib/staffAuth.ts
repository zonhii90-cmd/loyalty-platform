import { NextRequest, NextResponse } from 'next/server'
import { sql } from './db'

export interface StaffAuth {
  staffId: string
  staffName: string
  staffRole: 'manager' | 'cashier'
  companyId: string
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + pin)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createPinHash(pin: string): Promise<string> {
  const salt = crypto.randomUUID()
  const hash = await hashPin(pin, salt)
  return `${salt}:${hash}`
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const computed = await hashPin(pin, salt)
  return computed === hash
}

export async function validateStaff(req: NextRequest): Promise<StaffAuth | null> {
  const staffId  = req.headers.get('x-staff-id')  || ''
  const companyId = req.headers.get('x-staff-company-id') || ''
  if (!staffId || !companyId) return null

  const db = sql()
  const rows = await db`
    SELECT id, name, role, company_id FROM staff
    WHERE id = ${staffId} AND company_id = ${companyId} AND active = true
    LIMIT 1
  `
  const s = rows[0]
  if (!s) return null
  return { staffId: s.id, staffName: s.name, staffRole: s.role, companyId: s.company_id }
}

export function staffUnauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
