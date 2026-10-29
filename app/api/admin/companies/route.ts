import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

// Super admin only

export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth || !auth.isSuperAdmin) return unauthorized()

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, email, created_at')
    .neq('id', 'super')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ companies: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth || !auth.isSuperAdmin) return unauthorized()

  const { id, name, password, email } = await req.json()
  if (!id?.trim() || !name?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'id, name, password required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase.from('companies').insert({
    id: id.trim().toLowerCase().replace(/\s+/g, '-'),
    name: name.trim(),
    password: password.trim(),
    email: email?.trim() || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth || !auth.isSuperAdmin) return unauthorized()

  const id = req.nextUrl.searchParams.get('id')
  if (!id || id === 'super') return NextResponse.json({ error: 'Cannot delete super' }, { status: 400 })

  const supabase = getAdminClient()
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
