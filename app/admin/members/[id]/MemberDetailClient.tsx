'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import AdminShell from '@/components/AdminShell'

interface LedgerEntry {
  id: string; type: 'earn'|'redeem'|'adjust'; amount: number
  source: string; note: string|null; created_by: string|null; created_at: string
}
interface Membership {
  id: string; points: number; tier: string; joined_at: string
  member: { id: string; phone: string; name: string|null; birthday: string|null }
}

const typeColor = { earn: 'text-emerald-600', redeem: 'text-red-500', adjust: 'text-amber-500' }

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)  return m <= 1 ? 'Just now' : `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}
const srcLabel: Record<string, string> = {
  manual: 'Manual', feedback: 'Feedback', purchase: 'Purchase',
  birthday: 'Birthday', adjustment: 'Adjustment', referral: 'Referral',
  qr_scan: 'QR Scan', stamp_redeem: 'Stamp reward', reward_redeem: 'Reward redeemed',
}

export default function MemberDetailClient() {
  const { authFetch } = useAuth()
  const { id }        = useParams<{ id: string }>()
  const router        = useRouter()

  const [membership, setMembership] = useState<Membership | null>(null)
  const [ledger,     setLedger]     = useState<LedgerEntry[]>([])
  const [loading,    setLoading]    = useState(true)

  const [showModal, setShowModal]   = useState(false)
  const [mType,     setMType]       = useState<'earn'|'redeem'|'adjust'>('earn')
  const [mAmount,   setMAmount]     = useState('')
  const [mNote,     setMNote]       = useState('')
  const [saving,    setSaving]      = useState(false)
  const [err,       setErr]         = useState('')

  function load() {
    setLoading(true)
    authFetch('/api/admin/members/' + id)
      .then(r => r.json())
      .then(d => { setMembership(d.membership); setLedger(d.ledger || []) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  async function submitPoints() {
    const amt = parseInt(mAmount, 10)
    if (!amt || isNaN(amt)) { setErr('Enter a valid amount'); return }
    setSaving(true); setErr('')
    const finalAmount = mType === 'redeem' ? -Math.abs(amt) : amt
    const res = await authFetch('/api/admin/members/points', {
      method: 'POST',
      body: JSON.stringify({ membership_id: id, type: mType, amount: finalAmount, note: mNote }),
    })
    const d = await res.json()
    if (d.error) { setErr(d.error) }
    else { setShowModal(false); setMAmount(''); setMNote(''); load() }
    setSaving(false)
  }

  function openModal(type: 'earn'|'redeem'|'adjust') {
    setMType(type); setMAmount(''); setMNote(''); setErr(''); setShowModal(true)
  }

  if (loading) return (
    <AdminShell>
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </AdminShell>
  )

  if (!membership) return (
    <AdminShell>
      <div className="text-center py-16 text-gray-400">Member not found</div>
    </AdminShell>
  )

  return (
    <AdminShell>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="text-sm text-gray-400 mb-4 flex items-center gap-1">
          ← Back
        </button>

        {/* Profile */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 font-bold text-xl shrink-0">
              {(membership.member.name || membership.member.phone).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-lg">{membership.member.name || '—'}</p>
              <p className="text-sm text-gray-400">{membership.member.phone}</p>
              {membership.member.birthday && (
                <p className="text-xs text-gray-400">🎂 {membership.member.birthday}</p>
              )}
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 font-medium capitalize">
              {membership.tier}
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Points balance</p>
              <p className="text-3xl font-bold text-violet-600">{membership.points}</p>
            </div>
            <p className="text-xs text-gray-300">Joined {new Date(membership.joined_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => openModal('earn')}
            className="flex-1 py-3 rounded-2xl bg-emerald-50 text-emerald-600 text-sm font-medium">
            + Add Points
          </button>
          <button onClick={() => openModal('redeem')}
            className="flex-1 py-3 rounded-2xl bg-red-50 text-red-500 text-sm font-medium">
            − Deduct
          </button>
          <button onClick={() => openModal('adjust')}
            className="flex-1 py-3 rounded-2xl bg-amber-50 text-amber-500 text-sm font-medium">
            ± Adjust
          </button>
        </div>

        {/* Ledger */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Points history</p>
          {ledger.length === 0 ? (
            <p className="text-center py-6 text-gray-300 text-sm">No entries yet</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {ledger.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{srcLabel[entry.source] || entry.source}</p>
                    {entry.note && <p className="text-xs text-gray-400 truncate">{entry.note}</p>}
                    <p className="text-xs text-gray-300">{relTime(entry.created_at)}</p>
                  </div>
                  <p className={'text-base font-bold shrink-0 ' + typeColor[entry.type]}>
                    {entry.amount > 0 ? '+' : ''}{entry.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Points modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-gray-800 mb-4">
              {mType === 'earn' ? 'Add Points' : mType === 'redeem' ? 'Deduct Points' : 'Adjust Points'}
            </p>
            <input type="number" min="1" value={mAmount} onChange={e => setMAmount(e.target.value)}
              placeholder="Amount" autoFocus
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300 mb-3" />
            <input type="text" value={mNote} onChange={e => setMNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300 mb-3" />
            {err && <p className="text-xs text-red-500 mb-3">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-500">
                Cancel
              </button>
              <button onClick={submitPoints} disabled={saving || !mAmount}
                className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-40">
                {saving ? '...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
