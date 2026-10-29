import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { validateAdmin, unauthorized } from '@/lib/adminAuth'

// GET /api/admin/stats
export async function GET(req: NextRequest) {
  const auth = await validateAdmin(req)
  if (!auth) return unauthorized()
  const { companyId } = auth

  const supabase = getAdminClient()

  // Total members
  const { count: totalMembers } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  // Total points issued (earn entries)
  const { data: earnData } = await supabase
    .from('points_ledger')
    .select('amount, memberships!inner(company_id)')
    .eq('memberships.company_id', companyId)
    .eq('type', 'earn')

  const totalPointsIssued = (earnData || []).reduce((sum: number, r: any) => sum + r.amount, 0)

  // Total points balance (sum of memberships)
  const { data: balanceData } = await supabase
    .from('memberships')
    .select('points')
    .eq('company_id', companyId)

  const totalPointsBalance = (balanceData || []).reduce((sum: number, r: any) => sum + r.points, 0)

  // New members this month
  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  const { count: newThisMonth } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('joined_at', monthStart.toISOString())

  // Recent activity (last 10 ledger entries)
  const { data: recentActivity } = await supabase
    .from('points_ledger')
    .select('id, type, amount, source, note, created_at, memberships!inner(company_id, member:member_id(phone, name))')
    .eq('memberships.company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    totalMembers:      totalMembers || 0,
    totalPointsIssued,
    totalPointsBalance,
    newThisMonth:      newThisMonth || 0,
    recentActivity:    recentActivity || [],
  })
}
