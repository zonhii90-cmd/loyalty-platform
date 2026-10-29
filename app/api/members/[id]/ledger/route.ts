import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

// GET /api/members/[id]/ledger  (public — membership UUID is unguessable capability token)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('points_ledger')
    .select('id, type, amount, source, note, created_at')
    .eq('membership_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ledger: data || [] })
}
