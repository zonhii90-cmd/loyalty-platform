'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'

interface LedgerEntry {
  id: string; type: 'earn'|'redeem'|'adjust'; amount: number
  source: string; note: string|null; created_at: string
}
interface StampProgress {
  count: number; completed_count: number
  goal: number; reward_text: string; earn_mode: string
}
interface PortalData {
  member: { phone: string; name: string|null }
  membership: { id: string; points: number; tier: string; joined_at: string }
  ledger: LedgerEntry[]
  stamp: StampProgress | null
}

const srcLabel: Record<string, string> = {
  manual: 'Manual adjustment', feedback: 'Feedback reward', purchase: 'Purchase reward',
  birthday: 'Birthday bonus', adjustment: 'Adjustment', referral: 'Referral bonus',
}

const tierGrad: Record<string, string> = {
  bronze: 'from-amber-400 to-amber-600',
  silver: 'from-gray-400 to-gray-600',
  gold:   'from-yellow-400 to-yellow-600',
}

export default function MemberPortalClient() {
  const { phone } = useParams<{ phone: string }>()
  const searchParams = useSearchParams()
  const router    = useRouter()
  const companyId = searchParams.get('c') || ''

  const [data,    setData]    = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')

  useEffect(() => {
    if (!phone || !companyId) { setErr('Invalid link'); setLoading(false); return }

    fetch('/api/members/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: decodeURIComponent(phone), company_id: companyId }),
    })
      .then(r => r.json())
      .then(async d => {
        if (d.error) { setErr(d.error); return }
        const [ledgerRes, stampRes] = await Promise.all([
          fetch('/api/members/' + d.membership.id + '/ledger'),
          fetch('/api/members/' + d.membership.id + '/stamps'),
        ])
        const ledgerData = await ledgerRes.json()
        const stampData  = await stampRes.json()
        setData({ member: d.member, membership: d.membership, ledger: ledgerData.ledger || [], stamp: stampData.stamp || null })
      })
      .catch(() => setErr('Network error'))
      .finally(() => setLoading(false))
  }, [phone, companyId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (err || !data) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-400 mb-4">{err || 'Something went wrong'}</p>
        <button onClick={() => router.back()} className="text-violet-600 text-sm">← Go back</button>
      </div>
    </div>
  )

  const { member, membership, ledger, stamp } = data
  const grad = tierGrad[membership.tier] || tierGrad.bronze

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className={`bg-gradient-to-br ${grad} text-white px-4 pt-12 pb-10`}>
        <div className="max-w-sm mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mx-auto mb-3">
            {(member.name || member.phone).charAt(0).toUpperCase()}
          </div>
          <p className="font-bold text-xl">{member.name || member.phone}</p>
          {member.name && <p className="text-white/70 text-sm mt-0.5">{member.phone}</p>}
          <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold capitalize">
            {membership.tier} Member
          </span>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 -mt-4">
        <div className="bg-white rounded-3xl shadow-sm p-6 text-center mb-4">
          <p className="text-xs text-gray-400 mb-1">Your Points Balance</p>
          <p className="text-5xl font-bold text-violet-600">{membership.points}</p>
          <p className="text-xs text-gray-300 mt-2">
            Member since {new Date(membership.joined_at).toLocaleDateString()}
          </p>
        </div>

        {stamp && (
          <div className="bg-white rounded-3xl shadow-sm p-4 mb-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Stamp Card</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Array.from({ length: stamp.goal }).map((_, i) => (
                <div key={i} className={'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs ' +
                  (i < stamp.count ? 'bg-violet-500 border-violet-500 text-white' : 'border-gray-200 text-gray-300')}>
                  {i < stamp.count ? '✓' : ''}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-violet-600">{stamp.count}</span>/{stamp.goal} stamps ·{' '}
              {stamp.goal - stamp.count > 0
                ? <>{stamp.goal - stamp.count} more for <span className="font-medium text-gray-600">{stamp.reward_text}</span></>
                : 'Card complete!'}
            </p>
            {stamp.completed_count > 0 && (
              <p className="text-xs text-gray-300 mt-1">Completed {stamp.completed_count}× before</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Points History</p>
          {ledger.length === 0 ? (
            <p className="text-center py-6 text-gray-300 text-sm">No history yet</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {ledger.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{srcLabel[entry.source] || entry.source}</p>
                    {entry.note && <p className="text-xs text-gray-400 truncate">{entry.note}</p>}
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
      </div>
    </div>
  )
}
