import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { companyId, password } = await req.json()
  if (!companyId || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, password')
    .eq('id', companyId)
    .single()

  if (error || !data || data.password !== password) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  return NextResponse.json({ companyId: data.id, companyName: data.name, token: data.password })
}
