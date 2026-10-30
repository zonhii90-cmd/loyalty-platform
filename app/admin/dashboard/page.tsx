'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import AdminShell from '@/components/AdminShell'
import { Users, Zap, QrCode, Ticket, Loader2 } from 'lucide-react'

interface Stats {
  totalMembers:       number
  totalPointsIssued:  number
  totalPointsBalance: number
  newThisMonth:       number
  today: {
    newMembers:       number
    scans:            number
    vouchersRedeemed: number
    pointsEarned:     number
  }
  recentActivity: {
    id: string; type: string; amount: number
    source: string; note: string | null; created_at: string
    phone: string; name: string | null
  }[]
}

const srcLabel: Record<string, string> = {
  manual: 'Manual', feedback: 'Feedback', purchase: 'Purchase',
  birthday: 'Birthday', adjustment: 'Adjustment', referral: 'Referral',
  qr_scan: 'QR Scan', stamp_redeem: 'Stamp reward',
}

export default function DashboardPage() {
  const { authFetch, companyName } = useAuth()
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authFetch('/api/admin/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminShell>
      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-400">{companyName}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-violet-400" />
          </div>
        ) : !stats ? null : (
          <>
            {/* Today strip */}
            <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-5 mb-5 text-white">
              <p className="text-xs font-medium text-violet-200 mb-3">Today</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: <Users size={14} />,   label: 'New',     value: stats.today.newMembers },
                  { icon: <QrCode size={14} />,  label: 'Scans',   value: stats.today.scans },
                  { icon: <Zap size={14} />,     label: 'Points',  value: stats.today.pointsEarned.toLocaleString() },
                  { icon: <Ticket size={14} />,  label: 'Vouchers', value: stats.today.vouchersRedeemed },
                ].map(t => (
                  <div key={t.label} className="text-center">
                    <p className="text-2xl font-bold">{t.value}</p>
                    <p className="text-xs text-violet-200 mt-0.5">{t.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* All-time tiles */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Total Members',    value: stats.totalMembers.toLocaleString(),       sub: `+${stats.newThisMonth} this month` },
                { label: 'Points Balance',   value: stats.totalPointsBalance.toLocaleString(), sub: `${stats.totalPointsIssued.toLocaleString()} issued total` },
              ].map(tile => (
                <div key={tile.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-400 mb-1">{tile.label}</p>
                  <p className="text-2xl font-bold text-violet-600">{tile.value}</p>
                  <p className="text-xs text-gray-300 mt-1">{tile.sub}</p>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 mb-3">Recent Activity</p>
              {stats.recentActivity.length === 0 ? (
                <p className="text-center py-6 text-gray-300 text-sm">No activity yet</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-50">
                  {stats.recentActivity.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 font-medium">
                          {entry.name || entry.phone}
                        </p>
                        <p className="text-xs text-gray-400">
                          {srcLabel[entry.source] || entry.source}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </p>
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
