import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from './supabase'

export interface AdminAuth {
  companyId: string
  isSuperAdmin: boolean
}

export async function validateAdmin(req: NextRequest): Promise<AdminAuth | null> {
  const token     = req.headers.get('x-admin-token') || ''
  const companyId = req.headers.get('x-company-id')  || ''

  if (!token || !companyId) return null

  const supabase = getAdminClient()
  const { data } = await supabase
    .from('companies')
    .select('id, password')
    .eq('id', companyId)
    .single()

  if (!data || data.password !== token) return null
  return { companyId, isSuperAdmin: companyId === 'super' }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
