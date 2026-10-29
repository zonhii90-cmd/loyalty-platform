import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

// POST /api/members/lookup
// { phone, company_id, name? }
export async function POST(req: NextRequest) {
  const { phone, company_id, name } = await req.json()
  if (!phone?.trim() || !company_id?.trim()) {
    return NextResponse.json({ error: 'phone and company_id required' }, { status: 400 })
  }

  const normalised = phone.trim().replace(/\s+/g, '')
  const supabase   = getAdminClient()

  // Find or create member
  let member: any
  const { data: existing } = await supabase
    .from('members')
    .select('*')
    .eq('phone', normalised)
    .single()

  if (existing) {
    member = existing
  } else {
    const { data: created, error } = await supabase
      .from('members')
      .insert({ phone: normalised, name: name?.trim() || null })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    member = created
  }

  // Find or create membership for this company
  let membership: any
  let isNew = false
  const { data: existingMs } = await supabase
    .from('memberships')
    .select('*')
    .eq('member_id', member.id)
    .eq('company_id', company_id)
    .single()

  if (existingMs) {
    membership = existingMs
  } else {
    const { data: created, error } = await supabase
      .from('memberships')
      .insert({ member_id: member.id, company_id })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    membership = created
    isNew = true
  }

  return NextResponse.json({ member, membership, isNew })
}
