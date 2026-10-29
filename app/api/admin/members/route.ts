import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

// GET /api/admin/members?page=1&q=search
export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { companyId } = auth

  const page  = parseInt(req.nextUrl.searchParams.get('page') || '1', 10)
  const q     = req.nextUrl.searchParams.get('q')?.trim() || ''
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = getAdminClient()

  const { data, error, count } = await supabase
    .from('memberships')
    .select('id, points, tier, joined_at, member:member_id(id, phone, name, birthday, created_at)', { count: 'exact' })
    .eq('company_id', companyId)
    .order('joined_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let rows = data || []
  if (q) {
    rows = rows.filter((r: any) =>
      r.member?.phone?.includes(q) ||
      r.member?.name?.toLowerCase().includes(q.toLowerCase())
    )
  }

  return NextResponse.json({ members: rows, total: count || 0, page, limit })
}
