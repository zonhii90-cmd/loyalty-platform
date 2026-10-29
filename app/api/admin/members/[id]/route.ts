import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

// GET /api/admin/members/[id]  (id = membership id)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { companyId } = auth

  const supabase = getAdminClient()

  const { data: membership, error } = await supabase
    .from('memberships')
    .select('id, points, tier, joined_at, member:member_id(id, phone, name, birthday, created_at)')
    .eq('id', params.id)
    .eq('company_id', companyId)
    .single()

  if (error || !membership) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: ledger } = await supabase
    .from('points_ledger')
    .select('*')
    .eq('membership_id', params.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({ membership, ledger: ledger || [] })
}

// PATCH /api/admin/members/[id]  — update member name/birthday
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { companyId } = auth

  const supabase = getAdminClient()

  // Verify membership belongs to this company, get member_id
  const { data: ms } = await supabase
    .from('memberships')
    .select('id, member_id')
    .eq('id', params.id)
    .eq('company_id', companyId)
    .single()

  if (!ms) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const update: Record<string, any> = {}
  if (body.name     !== undefined) update.name     = body.name || null
  if (body.birthday !== undefined) update.birthday = body.birthday || null

  if (Object.keys(update).length === 0) return NextResponse.json({ success: true })

  const { error } = await supabase.from('members').update(update).eq('id', ms.member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
