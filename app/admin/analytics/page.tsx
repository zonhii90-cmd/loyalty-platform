'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { useAuth } from '@/lib/auth-context'
import { BarChart2, Users, Zap, Ticket, Download, Loader2, TrendingUp, Stamp } from 'lucide-react'

/* ── tiny SVG chart helpers ───────────────────────────────────────────── */

function BarChart({ data, color = '#7c3aed', h = 80 }: { data: number[]; color?: string; h?: number }) {
  if (!data.length) return <div className="h-20 flex items-center justify-center text-xs text-gray-200">No data</div>
  const max = Math.max(...data, 1)
  const w   = 400
  const barW = Math.max(2, (w / data.length) - 2)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      {data.map((v, i) => {
        const bh = Math.max(2, (v / max) * (h - 4))
        return (
          <rect key={i}
            x={i * (w / data.length) + 1}
            y={h - bh}
            width={barW}
            height={bh}
            rx={2}
            fill={color}
            opacity={0.85}
          />
        )
      })}
    </svg>
  )
}

function DualBarChart({ earned, redeemed, h = 80 }: { earned: number[]; redeemed: number[]; h?: number }) {
  const all = [...earned, ...redeemed]
  const max = Math.max(...all, 1)
  const n   = Math.max(earned.length, redeemed.length)
  const w   = 400
  const slot = w / Math.max(n, 1)
  const bw   = Math.max(2, slot / 2 - 2)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      {Array.from({ length: n }).map((_, i) => {
        const e  = earned[i]   || 0
        const r  = redeemed[i] || 0
        const eh = Math.max(2, (e / max) * (h - 4))
        const rh = Math.max(2, (r / max) * (h - 4))
        const x  = i * slot
        return (
          <g key={i}>
            <rect x={x + 1}       y={h - eh} width={bw} height={eh} rx={2} fill="#7c3aed" opacity={0.8} />
            <rect x={x + bw + 3}  y={h - rh} width={bw} height={rh} rx={2} fill="#f43f5e" opacity={0.7} />
          </g>
        )
      })}
    </svg>
  )
}

/* ── types ────────────────────────────────────────────────────────────── */

interface Analytics {
  overview: { total_members: number; active_30d: number; earned_30d: number; vouchers_redeemed: number }
  membersByDay: { day: string; count: number }[]
  pointsByDay:  { day: string; type: 'earn' | 'redeem'; total: number }[]
  topMembers:   { name: string | null; phone: string; points: number; tier: string }[]
  tierBreakdown: { tier: string; count: number }[]
  campaignStats: { name: string; multiplier: number; starts_at: string; ends_at: string; active: boolean; scans: number; total_points: number }[]
  stampStats:   { total_cards: number; total_completed: number; stamps_in_progress: number; avg_current_stamps: number; goal: number } | null
}

/* ── helpers ──────────────────────────────────────────────────────────── */

function fillDays(data: { day: string; count: number }[], days = 30): number[] {
  const map: Record<string, number> = {}
  data.forEach(d => { map[d.day.slice(0, 10)] = d.count })
  return Array.from({ length: days }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i))
    return map[d.toISOString().slice(0, 10)] || 0
  })
}

function fillPointDays(data: { day: string; type: string; total: number }[], type: string, days = 30): number[] {
  const map: Record<string, number> = {}
  data.filter(d => d.type === type).forEach(d => { map[d.day.slice(0, 10)] = d.total })
  return Array.from({ length: days }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i))
    return map[d.toISOString().slice(0, 10)] || 0
  })
}

const tierColor: Record<string, string> = {
  bronze: 'text-amber-600 bg-amber-50',
  silver: 'text-gray-500 bg-gray-100',
  gold:   'text-yellow-600 bg-yellow-50',
}

/* ── page ─────────────────────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const { authFetch } = useAuth()
  const [data,    setData]    = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    authFetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  async function exportCsv() {
    setExporting(true)
    try {
      const r = await authFetch('/api/admin/analytics/export')
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminShell>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <BarChart2 size={20} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-400">Last 30 days overview</p>
            </div>
          </div>
          <button onClick={exportCsv} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 size={28} className="animate-spin text-violet-400" />
          </div>
        ) : !data ? (
          <p className="text-gray-400 text-sm">Failed to load analytics</p>
        ) : (
          <div className="space-y-5">

            {/* Stat tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: <Users size={18} />,   label: 'Total Members',    value: data.overview.total_members,   color: 'text-violet-600', bg: 'bg-violet-50' },
                { icon: <TrendingUp size={18}/>,label: 'Active (30d)',     value: data.overview.active_30d,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { icon: <Zap size={18} />,      label: 'Points Earned (30d)', value: data.overview.earned_30d.toLocaleString(), color: 'text-amber-600', bg: 'bg-amber-50' },
                { icon: <Ticket size={18} />,   label: 'Vouchers Redeemed', value: data.overview.vouchers_redeemed, color: 'text-rose-600', bg: 'bg-rose-50' },
              ].map(tile => (
                <div key={tile.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className={`w-8 h-8 rounded-lg ${tile.bg} ${tile.color} flex items-center justify-center mb-3`}>
                    {tile.icon}
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{tile.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{tile.label}</p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* New members */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-700 mb-1">New Members</p>
                <p className="text-xs text-gray-400 mb-4">Daily for the last 30 days</p>
                <BarChart data={fillDays(data.membersByDay)} color="#7c3aed" h={80} />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-300">30d ago</span>
                  <span className="text-xs text-gray-300">Today</span>
                </div>
              </div>

              {/* Points flow */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-700 mb-1">Points Flow</p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="w-3 h-3 rounded-sm bg-violet-500 inline-block" /> Earned
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="w-3 h-3 rounded-sm bg-rose-400 inline-block" /> Redeemed
                  </span>
                </div>
                <DualBarChart
                  earned={fillPointDays(data.pointsByDay, 'earn')}
                  redeemed={fillPointDays(data.pointsByDay, 'redeem')}
                  h={80}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-300">30d ago</span>
                  <span className="text-xs text-gray-300">Today</span>
                </div>
              </div>
            </div>

            {/* Tier breakdown */}
            {data.tierBreakdown.length > 0 && (() => {
              const total = data.tierBreakdown.reduce((s, r) => s + r.count, 0) || 1
              const tierColors: Record<string, string> = { bronze: '#d97706', silver: '#6b7280', gold: '#ca8a04' }
              const sorted = ['bronze', 'silver', 'gold'].map(t => ({
                tier: t,
                count: data.tierBreakdown.find(r => r.tier === t)?.count ?? 0,
              }))
              // Simple SVG donut
              let offset = 0
              const R = 40, cx = 50, cy = 50, stroke = 18
              const circ = 2 * Math.PI * R
              return (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-4">Tier Distribution</p>
                  <div className="flex items-center gap-8">
                    <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0 -rotate-90">
                      {sorted.map(({ tier, count }) => {
                        const pct = count / total
                        const dash = pct * circ
                        const el = (
                          <circle key={tier}
                            cx={cx} cy={cy} r={R}
                            fill="none"
                            stroke={tierColors[tier] || '#ccc'}
                            strokeWidth={stroke}
                            strokeDasharray={`${dash} ${circ - dash}`}
                            strokeDashoffset={-offset * circ}
                          />
                        )
                        offset += pct
                        return el
                      })}
                    </svg>
                    <div className="space-y-2 flex-1">
                      {sorted.map(({ tier, count }) => (
                        <div key={tier} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tierColors[tier] }} />
                          <span className="text-sm capitalize text-gray-700 flex-1">{tier}</span>
                          <span className="text-sm font-bold text-gray-800">{count}</span>
                          <span className="text-xs text-gray-400 w-10 text-right">{Math.round((count / total) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Campaign performance */}
            {data.campaignStats.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-violet-500" />
                  <p className="text-sm font-semibold text-gray-700">Campaign Performance</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-50">
                        <th className="text-left pb-2 font-medium">Campaign</th>
                        <th className="text-center pb-2 font-medium">Mult.</th>
                        <th className="text-right pb-2 font-medium">Scans</th>
                        <th className="text-right pb-2 font-medium">Points</th>
                        <th className="text-right pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.campaignStats.map(c => (
                        <tr key={c.name}>
                          <td className="py-2.5 pr-2">
                            <p className="font-medium text-gray-800 truncate max-w-[140px]">{c.name}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(c.starts_at).toLocaleDateString()} – {new Date(c.ends_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="text-xs font-bold text-amber-600">{c.multiplier}×</span>
                          </td>
                          <td className="py-2.5 text-right font-medium text-gray-700">{c.scans}</td>
                          <td className="py-2.5 text-right font-medium text-gray-700">{c.total_points.toLocaleString()}</td>
                          <td className="py-2.5 text-right">
                            <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium ' +
                              (c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400')}>
                              {c.active ? 'Live' : 'Ended'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stamp card stats */}
            {data.stampStats && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Stamp size={16} className="text-violet-500" />
                  <p className="text-sm font-semibold text-gray-700">Stamp Card</p>
                  <span className="text-xs text-gray-400 ml-auto">Goal: {data.stampStats.goal} stamps</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Cards in progress', value: data.stampStats.total_cards },
                    { label: 'Completed all-time', value: data.stampStats.total_completed },
                    { label: 'Avg current stamps', value: data.stampStats.avg_current_stamps },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-gray-800">{s.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Completion progress bar */}
                {data.stampStats.total_cards > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Average progress toward goal</span>
                      <span>{Math.round((data.stampStats.avg_current_stamps / data.stampStats.goal) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (data.stampStats.avg_current_stamps / data.stampStats.goal) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top members */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Top Members by Points</p>
              {data.topMembers.length === 0 ? (
                <p className="text-center py-6 text-gray-300 text-sm">No members yet</p>
              ) : (
                <div className="space-y-2">
                  {data.topMembers.map((m, i) => {
                    const maxPts = data.topMembers[0]?.points || 1
                    const pct    = Math.round((m.points / maxPts) * 100)
                    return (
                      <div key={m.phone} className="flex items-center gap-3">
                        <span className="text-xs text-gray-300 w-5 shrink-0 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-800 truncate">{m.name || m.phone}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium capitalize shrink-0 ${tierColor[m.tier] || tierColor.bronze}`}>
                              {m.tier}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-700 shrink-0 w-16 text-right">
                          {m.points.toLocaleString()} pts
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </AdminShell>
  )
}
