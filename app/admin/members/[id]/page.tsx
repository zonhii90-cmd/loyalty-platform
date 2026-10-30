'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import AdminShell from '@/components/AdminShell'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

interface MemberDetail {
  id: string; points: number; lifetime_points: number; tier: string
  joined_at: string; last_activity_at: string
  name: string | null; phone: string; birthday: string | null
  company_id: string
}
interface LedgerRow {
  id: string; type: string; amount: number; source: string; note: string | null; created_at: string
}
interface VoucherRow {
  id: string; code: string; type: string; description: string
  expires_at: string | null; redeemed_at: string | null; created_at: string
}

const tierColor: Record<string, string> = {
  bronze: 'text-amber-600 bg-amber-50',
  silver: 'text-gray-500 bg-gray-100',
  gold:   'text-yellow-600 bg-yellow-50',
}

const srcLabel: Record<string, string> = {
  manual: 'Manual', feedback: 'Feedback', purchase: 'Purchase',
  birthday: 'Birthday', adjustment: 'Adjustment', referral: 'Referral',
  qr_scan: 'QR Scan', stamp_redeem: 'Stamp', reward: 'Reward', reward_redeem: 'Reward redeemed',
}

function MemberDetailInner() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { authFetch } = useAuth()

  const [member,  setMember]  = useState<MemberDetail | null>(null)
  const [ledger,  setLedger]  = useState<LedgerRow[]>([])
  const [vouchers,setVouchers]= useState<VoucherRow[]>([])
  const [loading, setLoading] = useState(true)

  // Adjust form
  const [adjType,   setAdjType]   = useState<'earn'|'redeem'|'adjust'>('earn')
  const [adjAmount, setAdjAmount] = useState('')
  const [adjNote,   setAdjNote]   = useState('')
  const [adjSaving, setAdjSaving] = useState(false)
  const [adjMsg,    setAdjMsg]    = useState('')

  async function load() {
    setLoading(true)
    const r = await authFetch(`/api/admin/members/${id}`)
    const d = await r.json()
    if (r.ok) {
      setMember(d.member)
      setLedger(d.ledger)
      setVouchers(d.vouchers)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function applyAdjust() {
    if (!adjAmount || !member) return
    setAdjSaving(true); setAdjMsg('')
    const amount = adjType === 'redeem' ? -Math.abs(Number(adjAmount)) : Math.abs(Number(adjAmount))
    const r = await authFetch('/api/admin/members/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membership_id: id, type: adjType, amount, note: adjNote }),
    })
    const d = await r.json()
    setAdjSaving(false)
    if (!r.ok) { setAdjMsg(d.error || 'Failed'); return }
    setAdjMsg('Done! New balance: ' + d.points + ' pts')
    setAdjAmount(''); setAdjNote('')
    await load()
  }

  if (loading) return (
    <AdminShell>
      <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
    </AdminShell>
  )

  if (!member) return (
    <AdminShell>
      <div className="p-6 text-gray-400">Member not found</div>
    </AdminShell>
  )

  const activeVouchers = vouchers.filter(v => !v.redeemed_at && (!v.expires_at || new Date(v.expires_at) > new Date()))

  return (
    <AdminShell>
      <div className="p-6 max-w-2xl space-y-4">
        <button onClick={() => router.push('/admin/members')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-2">
          <ArrowLeft size={15} /> Members
        </button>

        {/* Member card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 font-bold text-xl shrink-0">
              {(member.name || member.phone).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-base font-bold text-gray-900">{member.name || '—'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${tierColor[member.tier] || tierColor.bronze}`}>
                  {member.tier}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{member.phone}</p>
              {member.birthday && (
                <p className="text-xs text-gray-400 mt-0.5">🎂 {String(member.birthday).slice(0, 10)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Points</p>
              <p className="text-2xl font-bold text-violet-600">{member.points}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Lifetime pts</p>
              <p className="text-2xl font-bold text-gray-800">{member.lifetime_points}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Joined</p>
              <p className="text-sm font-semibold text-gray-800">{new Date(member.joined_at).toLocaleDateString()}</p>
            </div>
          </div>

          <p className="text-xs text-gray-300 mt-3">
            Last activity: {member.last_activity_at ? new Date(member.last_activity_at).toLocaleString() : '—'}
          </p>
        </div>

        {/* Manual adjust */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Adjust Points</p>
          <div className="space-y-3">
            <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
              {(['earn', 'redeem', 'adjust'] as const).map(t => (
                <button key={t} onClick={() => setAdjType(t)}
                  className={'flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ' +
                    (adjType === t ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400')}>
                  {t}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={adjAmount} onChange={e => setAdjAmount(e.target.value.replace(/\D/g, ''))}
                type="number" inputMode="numeric" placeholder="Points"
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              <input value={adjNote} onChange={e => setAdjNote(e.target.value)}
                placeholder="Note (optional)"
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
            </div>
            {adjMsg && (
              <p className={'text-xs flex items-center gap-1 ' + (adjMsg.startsWith('Done') ? 'text-emerald-600' : 'text-red-500')}>
                {adjMsg.startsWith('Done') && <CheckCircle size={12} />}
                {adjMsg}
              </p>
            )}
            <button onClick={applyAdjust} disabled={adjSaving || !adjAmount}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {adjSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              {adjSaving ? 'Applying…' : 'Apply Adjustment'}
            </button>
          </div>
        </div>

        {/* Active vouchers */}
        {activeVouchers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Active Vouchers</p>
            <div className="space-y-2">
              {activeVouchers.map(v => (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl">
                  <p className="text-base font-mono font-bold text-violet-700 tracking-wider flex-1">{v.code}</p>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-700">{v.description}</p>
                    {v.expires_at && <p className="text-xs text-gray-400">Exp {new Date(v.expires_at).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ledger */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Points History</p>
          {ledger.length === 0 ? (
            <p className="text-center py-8 text-gray-300 text-sm">No transactions yet</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {ledger.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 py-3">
                  <div className={'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ' +
                    (entry.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-400')}>
                    {entry.amount > 0 ? '+' : '−'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 font-medium">{srcLabel[entry.source] || entry.source}</p>
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
    </AdminShell>
  )
}

export default function MemberDetailPage() {
  return <Suspense><MemberDetailInner /></Suspense>
}
