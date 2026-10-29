'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import AdminShell from '@/components/AdminShell'

interface Stats {
  totalMembers: number
  totalPointsIssued: number
  totalPointsBalance: number
  newThisMonth: number
  recentActivity: any[]
}

const sourceLabel: Record<string, string> = {
  manual: 'Manual', feedback: 'Feedback', purchase: 'Purchase',
  birthday: 'Birthday', adjustment: 'Adjustment', referral: 'Referral',
}

export default function DashboardPage() {
  const { authFetch, companyName } = useAuth()
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/admin/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const tiles = stats ? [
    { label: 'Total Members',    value: stats.totalMembers,       color: 'text-violet-600' },
    { label: 'New This Month',   value: stats.newThisMonth,       color: 'text-emerald-600' },
    { label: 'Points Issued',    value: stats.totalPointsIssued,  color: 'text-amber-600' },
    { label: 'Points Balance',   value: stats.totalPointsBalance, color: 'text-blue-600' },
  ] : []

  return (
    <AdminShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-400">{companyName}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {tiles.map(tile => (
                <div key={tile.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-400 mb-1">{tile.label}</p>
                  <p className={'text-3xl font-bold ' + tile.color}>
                    {tile.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">Recent Activity</p>
              {(stats?.recentActivity || []).length === 0 ? (
                <p className="text-center py-6 text-gray-300 text-sm">No activity yet</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-50">
                  {(stats?.recentActivity || []).map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">
                          {entry.memberships?.member?.name || entry.memberships?.member?.phone || '—'}
                        </p>
                        <p className="text-xs text-gray-400">{sourceLabel[entry.source] || entry.source}</p>
                        <p className="text-xs text-gray-300">{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                      <p className={'text-base font-bold shrink-0 ' + (entry.amount > 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {entry.amount > 0 ? '+' : ''}{entry.amount}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  )
}
