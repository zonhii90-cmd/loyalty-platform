import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

// POST /api/admin/members/points
// { membership_id, type: 'earn'|'redeem'|'adjust', amount, note?, created_by? }
export async function POST(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { companyId } = auth

  const { membership_id, type, amount, note, created_by } = await req.json()

  if (!membership_id || !type || typeof amount !== 'number' || amount === 0) {
    return NextResponse.json({ error: 'membership_id, type, and non-zero amount required' }, { status: 400 })
  }
  if (!['earn', 'redeem', 'adjust'].includes(type)) {
    return NextResponse.json({ error: 'type must be earn | redeem | adjust' }, { status: 400 })
  }

  const supabase = getAdminClient()

  const { data: ms } = await supabase
    .from('memberships')
    .select('id, points')
    .eq('id', membership_id)
    .eq('company_id', companyId)
    .single()

  if (!ms) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

  const newBalance = ms.points + amount
  if (newBalance < 0) return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })

  // Insert ledger
  const { error: ledgerErr } = await supabase.from('points_ledger').insert({
    membership_id,
    type,
    amount,
    source: 'manual',
    note: note?.trim() || null,
    created_by: created_by?.trim() || companyId,
  })
  if (ledgerErr) return NextResponse.json({ error: ledgerErr.message }, { status: 500 })

  // Update balance
  const { data: updated, error: updateErr } = await supabase
    .from('memberships')
    .update({ points: newBalance })
    .eq('id', membership_id)
    .select('points')
    .single()
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true, points: updated.points })
}
