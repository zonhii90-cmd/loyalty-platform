import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { companyId } = auth

  const supabase = getAdminClient()
  const { data } = await supabase
    .from('settings')
    .select('data')
    .eq('company_id', companyId)
    .single()

  return NextResponse.json({ settings: (data?.data as object) || {} })
}

export async function PUT(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { companyId } = auth

  const body = await req.json()
  const supabase = getAdminClient()

  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .eq('company_id', companyId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('settings')
      .update({ data: body, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('settings')
      .insert({ id: companyId, company_id: companyId, data: body, updated_at: new Date().toISOString() })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
