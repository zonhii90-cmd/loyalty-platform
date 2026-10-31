'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStaff } from '@/lib/staff-context'
import { QrCode, Stamp, LogOut, Loader2, Ticket, CheckCircle, XCircle, BarChart2, ChevronRight, X, ArrowLeft, Users, Search, Gift } from 'lucide-react'
import StampCardVisual from '@/components/StampCardVisual'

type Tab = 'stamp' | 'qr' | 'redeem' | 'dashboard'
type StampStep = 'input' | 'found' | 'success'

interface Receipt {
  points: number
  balance: number
  name: string | null
  companyName: string
}

export default function PosScreen() {
  const router = useRouter()
  const { isLoggedIn, staffName, staffRole, companyId, companyName, primaryColor, logout } = useStaff()
  const [tab, setTab]         = useState<Tab>('stamp')
  const [stampStep, setStampStep] = useState<StampStep>('input')

  // Stamp / lookup state
  const [phone, setPhone]         = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [member, setMember]       = useState<any>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [stampMsg, setStampMsg]   = useState('')
  const [stampAdding, setStampAdding] = useState(false)
  const [stampProgress, setStampProgress] = useState<any>(null)
  const [stampAnimIdx,  setStampAnimIdx]  = useState<number | null>(null)
  const [stampAnimKey,  setStampAnimKey]  = useState(0)
  const [stampEarnMode, setStampEarnMode] = useState<'qr' | 'manual' | null>(null)
  const [justStamped, setJustStamped] = useState(false)
  const [claimingReward, setClaimingReward] = useState(false)
  const [claimMsg, setClaimMsg] = useState('')

  // QR state
  const [earnType, setEarnType] = useState<'fixed' | 'purchase'>('fixed')
  const [points, setPoints]   = useState('')
  const [amount, setAmount]   = useState('')
  const [qrData, setQrData]   = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  // Redeem state
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherResult, setVoucherResult] = useState<{ success: boolean; message: string } | null>(null)
  const [voucherLoading, setVoucherLoading] = useState(false)

  // Search state
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Dashboard
  const [dashStats, setDashStats] = useState<any>(null)

  const phoneRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/pos')
  }, [isLoggedIn])

  useEffect(() => {
    if (tab === 'dashboard') loadDashStats()
    if (tab === 'stamp' && stampEarnMode === null) loadStampCardMode()
    if (tab === 'stamp') setTimeout(() => phoneRef.current?.focus(), 100)
  }, [tab])

  async function loadStampCardMode() {
    let staffId = ''
    try { staffId = JSON.parse(localStorage.getItem('lp_staff') || '{}').staffId || '' } catch {}
    const r = await fetch('/api/pos/stamp-card', {
      headers: { 'x-staff-id': staffId, 'x-staff-company-id': companyId || '' },
    })
    if (r.ok) {
      const d = await r.json()
      setStampEarnMode(d.stampCard?.earn_mode || 'manual')
    }
  }

  if (!isLoggedIn) return null

  const color     = primaryColor || '#7c3aed'
  const isManager = staffRole === 'manager'

  function staffHeaders() {
    let staffId = ''
    try { staffId = JSON.parse(localStorage.getItem('lp_staff') || '{}').staffId || '' } catch {}
    return {
      'Content-Type': 'application/json',
      'x-staff-id': staffId,
      'x-staff-company-id': companyId || '',
    }
  }

  function resetStamp() {
    setPhone(''); setNewMemberName(''); setMember(null); setStampMsg('')
    setStampProgress(null); setStampStep('input'); setJustStamped(false)
    setClaimMsg(''); setClaimingReward(false)
    setTimeout(() => phoneRef.current?.focus(), 100)
  }

  async function claimReward() {
    if (!member) return
    setClaimingReward(true); setClaimMsg('')
    const r = await fetch('/api/pos/stamp/claim-reward', {
      method: 'POST',
      headers: staffHeaders(),
      body: JSON.stringify({ membershipId: member.id }),
    })
    const d = await r.json()
    if (r.ok) {
      // Reset count to 0 locally so card shows as new
      setStampProgress(prev => prev ? { ...prev, count: 0 } : null)
      setClaimMsg(`✓ Reward confirmed: ${d.rewardText}`)
      setStampStep('success')
    } else {
      setClaimMsg(d.error || 'Failed to confirm reward')
    }
    setClaimingReward(false)
  }

  async function lookupMember() {
    if (!phone.trim()) return
    setLookupLoading(true); setMember(null); setStampProgress(null); setStampMsg('')
    const r = await fetch('/api/members/lookup', {
      method: 'POST',
      headers: staffHeaders(),
      body: JSON.stringify({ phone: phone.trim(), company_id: companyId, name: newMemberName.trim() || undefined }),
    })
    const d = await r.json()
    if (r.ok) {
      setMember({ ...d.membership, member: d.member })
      const sr = await fetch('/api/members/' + d.membership.id + '/stamps')
      const sd = await sr.json()
      if (sd.stamp) { setStampProgress(sd.stamp); setStampAnimIdx(null) }
      setStampStep('found')
    } else {
      setStampMsg(d.error || 'Member not found')
    }
    setLookupLoading(false)
  }

  async function addStamp() {
    if (!member) return
    setStampAdding(true); setStampMsg('')
    const r = await fetch('/api/pos/stamp/add', {
      method: 'POST',
      headers: staffHeaders(),
      body: JSON.stringify({ membershipId: member.id }),
    })
    const d = await r.json()
    if (r.ok) {
      const newCount  = d.count
      const prevCount = stampProgress?.count ?? 0
      const newProgress = {
        count: newCount, goal: d.goal,
        completed_count: d.completed ? (stampProgress?.completed_count ?? 0) + 1 : (stampProgress?.completed_count ?? 0),
        reward_text: d.rewardText, earn_mode: 'manual',
        accent_color: d.accent_color, stamp_icon: d.stamp_icon, card_bg: d.card_bg,
      }
      setStampProgress(newProgress)
      if (newCount > prevCount || newCount === 1) {
        setStampAnimIdx(newCount - 1)
        setStampAnimKey(k => k + 1)
        setTimeout(() => setStampAnimIdx(null), 800)
      }
      setJustStamped(true)
      setStampStep('success')
      setStampMsg(d.message || 'Stamp added!')
    } else {
      setStampMsg(d.error || 'Error adding stamp')
    }
    setStampAdding(false)
  }

  async function generateQr() {
    setQrLoading(true); setQrData(null); setReceipt(null)
    const body = earnType === 'fixed'
      ? { earnType, points: Number(points) }
      : { earnType, amount: Number(amount) }
    const r = await fetch('/api/pos/qr/generate', {
      method: 'POST',
      headers: staffHeaders(),
      body: JSON.stringify(body),
    })
    const d = await r.json()
    if (r.ok) setQrData(d.qrUrl)
    setQrLoading(false)
  }

  async function redeemVoucher() {
    if (!voucherCode.trim()) return
    setVoucherLoading(true); setVoucherResult(null)
    const r = await fetch(`/api/admin/vouchers/${voucherCode.trim().toUpperCase()}/redeem`, {
      method: 'POST',
      headers: staffHeaders(),
    })
    const d = await r.json()
    setVoucherResult({
      success: r.ok,
      message: r.ok ? `Redeemed: ${d.voucher?.description || voucherCode}` : (d.error || 'Failed'),
    })
    if (r.ok) setVoucherCode('')
    setVoucherLoading(false)
  }

  async function searchMembers() {
    if (!searchQ.trim() || searchQ.length < 2) return
    setSearchLoading(true); setSearchResults([])
    let staffId = ''
    try { staffId = JSON.parse(localStorage.getItem('lp_staff') || '{}').staffId || '' } catch {}
    const r = await fetch('/api/members/search?q=' + encodeURIComponent(searchQ.trim()), {
      headers: { 'x-staff-id': staffId, 'x-staff-company-id': companyId || '' },
    })
    const d = await r.json()
    setSearchResults(d.results || [])
    setSearchLoading(false)
  }

  async function loadDashStats() {
    let staffId = ''
    try { staffId = JSON.parse(localStorage.getItem('lp_staff') || '{}').staffId || '' } catch {}
    const r = await fetch('/api/admin/stats', {
      headers: { 'x-admin-token': staffId, 'x-company-id': companyId || '' },
    })
    if (r.ok) setDashStats(await r.json())
  }

  // ─── Bottom nav tabs ─────────────────────────────────────────
  const allTabs = [
    { id: 'stamp' as Tab,     label: 'Stamp',    icon: <Stamp    size={22} /> },
    { id: 'qr'    as Tab,     label: 'QR Code',  icon: <QrCode   size={22} /> },
    { id: 'redeem' as Tab,    label: 'Voucher',  icon: <Ticket   size={22} /> },
    { id: 'dashboard' as Tab, label: 'Stats',    icon: <BarChart2 size={22} />, managerOnly: true },
  ]
  const tabs = allTabs.filter(t => !t.managerOnly || isManager)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F7F5' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-safe" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: color }}>
              {(companyName || 'C')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{companyName}</p>
              <p className="text-xs text-gray-400">{staffName}{isManager ? ' · Manager' : ''}</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.replace('/pos') }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* ══ STAMP TAB ════════════════════════════════════════ */}
        {tab === 'stamp' && (
          <div className="p-4 max-w-sm mx-auto w-full space-y-3">

            {/* QR mode info banner */}
            {stampEarnMode === 'qr' && stampStep === 'input' && (
              <div className="rounded-2xl p-4 flex gap-3 items-start"
                style={{ background: color + '12', border: `1px solid ${color}22` }}>
                <QrCode size={18} style={{ color }} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold" style={{ color }}>QR Stamp Mode</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Stamps are added automatically when members scan from the QR tab. You can still look up a member's progress below.</p>
                </div>
              </div>
            )}

            {/* ── Step: Phone input ── */}
            {stampStep === 'input' && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    {stampEarnMode === 'qr' ? 'Check Member' : 'Add Stamp'}
                  </p>

                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone number</label>
                  <input
                    ref={phoneRef}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && lookupMember()}
                    placeholder="+60 12-345 6789"
                    type="tel" inputMode="tel"
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 transition-all"
                    style={{ '--tw-ring-color': color + '40' } as React.CSSProperties}
                  />

                  {stampEarnMode !== 'qr' && (
                    <input
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      placeholder="Name (for new members)"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm mt-2 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': color + '40' } as React.CSSProperties}
                    />
                  )}

                  {stampMsg && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5">
                      <XCircle size={14} /> {stampMsg}
                    </p>
                  )}
                </div>

                <button
                  onClick={lookupMember}
                  disabled={lookupLoading || !phone.trim()}
                  className="w-full py-4 text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: color }}>
                  {lookupLoading
                    ? <><Loader2 size={18} className="animate-spin" /> Looking up…</>
                    : <>{stampEarnMode === 'qr' ? 'Find Member' : 'Find & Stamp'} <ChevronRight size={18} /></>
                  }
                </button>
              </div>
            )}

            {/* ── Step: Member found ── */}
            {stampStep === 'found' && member && (
              <div className="space-y-3">
                {/* Member card */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: color }}>
                        {(member.member?.name || phone)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-base leading-tight">
                          {member.member?.name || 'Member'}
                        </p>
                        <p className="text-sm text-gray-400">{phone}</p>
                      </div>
                    </div>
                    <button onClick={resetStamp} className="text-gray-300 hover:text-gray-500 p-1">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded-xl p-3" style={{ background: color + '10' }}>
                      <p className="text-xs text-gray-400">Points</p>
                      <p className="text-2xl font-bold" style={{ color }}>{member.points ?? 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Tier</p>
                      <p className="text-2xl font-bold text-gray-800 capitalize">{member.tier}</p>
                    </div>
                  </div>

                  {stampProgress && (
                    <StampCardVisual
                      count={stampProgress.count}
                      goal={stampProgress.goal}
                      reward_text={stampProgress.reward_text}
                      accent_color={stampProgress.accent_color}
                      stamp_icon={stampProgress.stamp_icon}
                      card_bg={stampProgress.card_bg}
                      completed_count={stampProgress.completed_count}
                      newStampIndex={stampAnimIdx}
                      animKey={stampAnimKey}
                      compact
                    />
                  )}
                </div>

                {/* Actions */}
                {stampProgress && Number(stampProgress.count) >= Number(stampProgress.goal) ? (
                  <div className="space-y-2">
                    <div className="rounded-2xl p-4 text-center"
                      style={{ background: color + '10', border: `1.5px solid ${color}30` }}>
                      <p className="text-sm font-semibold mb-0.5" style={{ color }}>🎉 Card Complete!</p>
                      <p className="text-xs text-gray-500">Give the customer their reward, then confirm below</p>
                      <p className="text-sm font-bold mt-1 text-gray-800">{stampProgress.reward_text}</p>
                    </div>
                    <button
                      onClick={claimReward}
                      disabled={claimingReward}
                      className="w-full py-5 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-sm active:scale-[0.98] transition-transform"
                      style={{ backgroundColor: color }}>
                      {claimingReward
                        ? <><Loader2 size={20} className="animate-spin" /> Confirming…</>
                        : <><Gift size={22} /> Confirm Reward Given</>
                      }
                    </button>
                    {claimMsg && (
                      <p className="text-sm text-center font-medium text-emerald-600">{claimMsg}</p>
                    )}
                  </div>
                ) : (stampEarnMode === 'manual' || !stampEarnMode) ? (
                  <button
                    onClick={addStamp}
                    disabled={stampAdding}
                    className="w-full py-5 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-sm active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: color }}>
                    {stampAdding
                      ? <><Loader2 size={20} className="animate-spin" /> Adding stamp…</>
                      : <><Stamp size={22} /> + Add Stamp</>
                    }
                  </button>
                ) : (
                  <button
                    onClick={resetStamp}
                    className="w-full py-4 text-sm font-medium rounded-2xl border border-gray-200 text-gray-600 flex items-center justify-center gap-2">
                    <ArrowLeft size={16} /> New customer
                  </button>
                )}
              </div>
            )}

            {/* ── Step: Success ── */}
            {stampStep === 'success' && stampProgress && (() => {
              const cardComplete = Number(stampProgress.count) >= Number(stampProgress.goal)
              const rewardJustConfirmed = claimMsg.startsWith('✓')
              return (
                <div className="space-y-3">
                  {/* Banner */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{ background: cardComplete ? color + '18' : color + '18' }}>
                      {cardComplete ? <Gift size={32} style={{ color }} /> : <CheckCircle size={32} style={{ color }} />}
                    </div>
                    {cardComplete ? (
                      <>
                        <p className="text-xl font-bold text-gray-900 mb-1">🎉 Card Complete!</p>
                        <p className="text-sm text-gray-400 mb-1">{member?.member?.name || phone}</p>
                        <p className="text-sm font-semibold" style={{ color }}>{stampProgress.reward_text}</p>
                      </>
                    ) : rewardJustConfirmed ? (
                      <>
                        <p className="text-xl font-bold text-gray-900 mb-1">Reward Confirmed!</p>
                        <p className="text-sm text-gray-400 mb-1">{member?.member?.name || phone}</p>
                        <p className="text-sm font-medium text-emerald-600">{claimMsg}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-gray-900 mb-1">Stamp Added!</p>
                        <p className="text-sm text-gray-400 mb-1">{member?.member?.name || phone}</p>
                        <p className="text-sm font-medium" style={{ color }}>
                          {stampProgress.count} / {stampProgress.goal} stamps
                        </p>
                        {stampMsg && stampMsg !== 'Stamp added!' && (
                          <p className="mt-2 text-sm font-semibold" style={{ color }}>{stampMsg}</p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <StampCardVisual
                      count={stampProgress.count}
                      goal={stampProgress.goal}
                      reward_text={stampProgress.reward_text}
                      accent_color={stampProgress.accent_color}
                      stamp_icon={stampProgress.stamp_icon}
                      card_bg={stampProgress.card_bg}
                      completed_count={stampProgress.completed_count}
                      newStampIndex={stampAnimIdx}
                      animKey={stampAnimKey}
                      compact
                    />
                  </div>

                  {cardComplete && !rewardJustConfirmed ? (
                    <button
                      onClick={claimReward}
                      disabled={claimingReward}
                      className="w-full py-5 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-sm active:scale-[0.98] transition-transform"
                      style={{ backgroundColor: color }}>
                      {claimingReward
                        ? <><Loader2 size={20} className="animate-spin" /> Confirming…</>
                        : <><Gift size={22} /> Confirm Reward Given</>
                      }
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {!rewardJustConfirmed && (
                        <button
                          onClick={() => { setStampStep('found'); setJustStamped(false); setStampMsg('') }}
                          className="py-3.5 rounded-2xl border border-gray-200 text-sm font-medium text-gray-700 flex items-center justify-center gap-1.5">
                          <Stamp size={16} /> Same customer
                        </button>
                      )}
                      <button
                        onClick={resetStamp}
                        className={'py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5' + (rewardJustConfirmed ? ' col-span-2' : '')}
                        style={{ backgroundColor: color }}>
                        Next customer
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Search by name (always available in stamp tab) */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-full py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 flex items-center justify-center gap-2 hover:border-gray-300 transition-colors">
              <Search size={15} /> Search by name
            </button>

            {showSearch && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex gap-2 mb-3">
                  <input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchMembers()}
                    placeholder="Customer name…"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': color + '40' } as React.CSSProperties}
                  />
                  <button onClick={searchMembers} disabled={searchLoading || searchQ.length < 2}
                    className="px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: color }}>
                    {searchLoading ? <Loader2 size={15} className="animate-spin" /> : 'Go'}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="divide-y divide-gray-50">
                    {searchResults.map(r => (
                      <button
                        key={r.membership_id}
                        onClick={() => { setPhone(r.phone); setShowSearch(false); setSearchQ(''); setSearchResults([]) }}
                        className="w-full py-3 flex items-center justify-between text-left hover:bg-gray-50 rounded-xl px-1 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{r.name || r.phone}</p>
                          <p className="text-xs text-gray-400">{r.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color }}>{r.points} pts</p>
                          <p className="text-xs text-gray-400 capitalize">{r.tier}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.length === 0 && searchQ.length >= 2 && !searchLoading && (
                  <p className="text-xs text-gray-400 text-center py-2">No results</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ QR TAB ═══════════════════════════════════════════ */}
        {tab === 'qr' && (
          <div className="p-4 max-w-sm mx-auto w-full space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Generate Earn QR</p>

                <div className="flex gap-1.5 mb-5 bg-gray-100 p-1 rounded-xl">
                  {(['fixed', 'purchase'] as const).map(t => (
                    <button key={t}
                      onClick={() => { setEarnType(t); setQrData(null); setReceipt(null) }}
                      className={'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ' +
                        (earnType === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400')}>
                      {t === 'fixed' ? 'Fixed Points' : 'By Amount'}
                    </button>
                  ))}
                </div>

                {earnType === 'fixed' ? (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Points to award</label>
                    <input value={points} onChange={e => setPoints(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 50" type="number" inputMode="numeric"
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': color + '40' } as React.CSSProperties} />
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Purchase amount (RM)</label>
                    <input value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="e.g. 35.00" type="number" inputMode="decimal"
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': color + '40' } as React.CSSProperties} />
                  </div>
                )}
              </div>

              <button onClick={generateQr}
                disabled={qrLoading || (earnType === 'fixed' ? !points : !amount)}
                className="w-full py-4 text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: color }}>
                {qrLoading ? <><Loader2 size={18} className="animate-spin" /> Generating…</> : <><QrCode size={18} /> Generate QR Code</>}
              </button>
            </div>

            {qrData && !receipt && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center">
                <p className="text-xs font-medium text-gray-400 mb-4">Member scans this to earn points</p>
                <img src={qrData} alt="QR Code" className="w-56 h-56 rounded-2xl border border-gray-100" />
                <p className="text-xs text-gray-300 mt-3">Expires in 5 minutes</p>
                <button onClick={() => { setQrData(null); setPoints(''); setAmount('') }}
                  className="mt-4 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                  <X size={12} /> Clear
                </button>
              </div>
            )}

            {receipt && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: '#10b98120' }}>
                  <CheckCircle size={28} className="text-emerald-500" />
                </div>
                <p className="text-xs text-gray-400 mb-2">{receipt.companyName}</p>
                <p className="text-xs text-gray-400">Points earned</p>
                <p className="text-5xl font-bold text-emerald-600 my-2">+{receipt.points}</p>
                <p className="text-sm text-gray-500">Balance: <span className="font-bold" style={{ color }}>{receipt.balance} pts</span></p>
                {receipt.name && <p className="text-sm text-gray-400 mt-1">{receipt.name}</p>}
                <p className="text-xs text-gray-300 mt-3">{new Date().toLocaleString()}</p>
                <button onClick={() => { setReceipt(null); setQrData(null); setPoints(''); setAmount('') }}
                  className="mt-4 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto">
                  <X size={12} /> Done
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ REDEEM TAB ═══════════════════════════════════════ */}
        {tab === 'redeem' && (
          <div className="p-4 max-w-sm mx-auto w-full">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Redeem Voucher</p>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Voucher code</label>
                <input
                  value={voucherCode}
                  onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherResult(null) }}
                  placeholder="ABC-12345"
                  autoCapitalize="characters"
                  onKeyDown={e => e.key === 'Enter' && redeemVoucher()}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base font-mono tracking-widest uppercase text-center focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': color + '40' } as React.CSSProperties}
                />
                {voucherResult && (
                  <div className={'mt-3 flex items-start gap-2.5 p-4 rounded-xl ' +
                    (voucherResult.success ? 'bg-emerald-50' : 'bg-red-50')}>
                    {voucherResult.success
                      ? <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      : <XCircle size={18} className="text-red-400 shrink-0 mt-0.5" />}
                    <p className={'text-sm font-medium ' + (voucherResult.success ? 'text-emerald-700' : 'text-red-500')}>
                      {voucherResult.message}
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-300 mt-3 text-center">Ask the customer to show their code</p>
              </div>
              <button onClick={redeemVoucher} disabled={voucherLoading || !voucherCode.trim()}
                className="w-full py-4 text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: color }}>
                {voucherLoading ? <><Loader2 size={18} className="animate-spin" /> Checking…</> : <><Ticket size={18} /> Redeem Voucher</>}
              </button>
            </div>
          </div>
        )}

        {/* ══ DASHBOARD TAB ════════════════════════════════════ */}
        {tab === 'dashboard' && isManager && (
          <div className="p-4 max-w-sm mx-auto w-full space-y-3">
            <div className="rounded-2xl p-5 text-white"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
              <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">Today</p>
              {!dashStats ? (
                <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-white/40" /></div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'New Members',  value: dashStats.today?.newMembers ?? 0 },
                    { label: 'QR Scans',     value: dashStats.today?.scans ?? 0 },
                    { label: 'Points Out',   value: dashStats.today?.pointsEarned ?? 0 },
                    { label: 'Vouchers',     value: dashStats.today?.vouchersRedeemed ?? 0 },
                  ].map(t => (
                    <div key={t.label} className="bg-white/15 rounded-2xl p-4 text-center backdrop-blur-sm">
                      <p className="text-3xl font-bold">{t.value}</p>
                      <p className="text-xs text-white/60 mt-1">{t.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {dashStats && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">All-time</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Members</p>
                    <p className="text-3xl font-bold text-gray-900">{dashStats.totalMembers}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Points Balance</p>
                    <p className="text-3xl font-bold text-gray-900">{dashStats.totalPointsBalance?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom nav ─────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex max-w-sm mx-auto">
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id}
                onClick={() => { setTab(t.id); if (t.id !== 'stamp') resetStamp() }}
                className="flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors"
                style={{ color: active ? color : '#9ca3af' }}>
                <div className="transition-transform" style={{ transform: active ? 'scale(1.1)' : 'scale(1)' }}>
                  {t.icon}
                </div>
                <span className={active ? 'font-semibold' : 'font-normal'}>{t.label}</span>
                {active && (
                  <div className="absolute bottom-0 w-10 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
