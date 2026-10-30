'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStaff } from '@/lib/staff-context'
import { QrCode, Stamp, Search, LogOut, Loader2, Ticket, CheckCircle, XCircle, BarChart2, Printer } from 'lucide-react'

type Tab = 'qr' | 'stamp' | 'lookup' | 'redeem' | 'dashboard'

interface Receipt {
  points: number
  balance: number
  name: string | null
  companyName: string
}

export default function PosScreen() {
  const router = useRouter()
  const { isLoggedIn, staffName, staffRole, companyId, companyName, primaryColor, logout } = useStaff()
  const [tab, setTab]       = useState<Tab>('qr')
  const [earnType, setEarnType] = useState<'fixed' | 'purchase'>('fixed')
  const [points, setPoints] = useState('')
  const [amount, setAmount] = useState('')
  const [qrData, setQrData] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [phone, setPhone]   = useState('')
  const [member, setMember] = useState<any>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [stampMsg, setStampMsg]   = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherResult, setVoucherResult] = useState<{ success: boolean; message: string } | null>(null)
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [dashStats, setDashStats] = useState<any>(null)
  const [stampProgress, setStampProgress] = useState<any>(null)

  useEffect(() => {
    if (!isLoggedIn) router.replace('/pos')
  }, [isLoggedIn])

  useEffect(() => {
    if (tab === 'dashboard') loadDashStats()
  }, [tab])

  if (!isLoggedIn) return null

  const color = primaryColor || '#7c3aed'
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

  async function lookupMember() {
    if (!phone.trim()) return
    setLookupLoading(true); setMember(null); setStampProgress(null)
    const r = await fetch('/api/members/lookup', {
      method: 'POST',
      headers: staffHeaders(),
      body: JSON.stringify({ phone: phone.trim(), company_id: companyId }),
    })
    const d = await r.json()
    if (r.ok) {
      setMember({ ...d.membership, member: d.member })
      // Fetch stamp progress for stamp tab
      const sr = await fetch('/api/members/' + d.membership.id + '/stamps')
      const sd = await sr.json()
      if (sd.stamp) setStampProgress(sd.stamp)
    }
    setLookupLoading(false)
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

  async function addStamp() {
    if (!member) return
    setStampMsg('')
    const r = await fetch('/api/pos/stamp/add', {
      method: 'POST',
      headers: staffHeaders(),
      body: JSON.stringify({ membershipId: member.id }),
    })
    const d = await r.json()
    if (r.ok) {
      setStampProgress({ count: d.count, goal: d.goal, completed_count: d.completed ? (stampProgress?.completed_count ?? 0) + 1 : (stampProgress?.completed_count ?? 0), reward_text: d.rewardText, earn_mode: 'manual' })
    }
    setStampMsg(d.message || (r.ok ? 'Stamp added!' : d.error || 'Error'))
    if (r.ok) lookupMember()
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
      message: r.ok ? `✓ Redeemed: ${d.voucher?.description || voucherCode}` : (d.error || 'Failed'),
    })
    if (r.ok) setVoucherCode('')
    setVoucherLoading(false)
  }

  async function loadDashStats() {
    let staffId = ''
    try { staffId = JSON.parse(localStorage.getItem('lp_staff') || '{}').staffId || '' } catch {}
    const r = await fetch('/api/admin/stats', {
      headers: { 'x-admin-token': staffId, 'x-company-id': companyId || '' },
    })
    if (r.ok) setDashStats(await r.json())
  }

  const allTabs: { id: Tab; label: string; icon: React.ReactNode; managerOnly?: boolean }[] = [
    { id: 'qr',        label: 'Generate QR', icon: <QrCode size={20} /> },
    { id: 'stamp',     label: 'Add Stamp',   icon: <Stamp size={20} /> },
    { id: 'lookup',    label: 'Look up',     icon: <Search size={20} /> },
    { id: 'redeem',    label: 'Voucher',     icon: <Ticket size={20} /> },
    { id: 'dashboard', label: 'Dashboard',   icon: <BarChart2 size={20} />, managerOnly: true },
  ]
  const tabs = allTabs.filter(t => !t.managerOnly || isManager)

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color }}>{companyName}</p>
          <p className="text-xs text-gray-400">{staffName}{isManager ? ' · Manager' : ''}</p>
        </div>
        <button onClick={() => { logout(); router.replace('/pos') }}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors">
          <LogOut size={14} /> Logout
        </button>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 flex">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ' +
              (tab === t.id ? 'font-medium border-b-2' : 'text-gray-400 border-b-2 border-transparent')}
            style={tab === t.id ? { color, borderColor: color } : {}}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 max-w-sm mx-auto w-full">

        {/* QR Generator */}
        {tab === 'qr' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-500 mb-4">Generate Earn QR</p>

            <div className="flex gap-2 mb-4 bg-gray-50 p-1 rounded-xl">
              {(['fixed', 'purchase'] as const).map(t => (
                <button key={t} onClick={() => { setEarnType(t); setQrData(null); setReceipt(null) }}
                  className={'flex-1 py-2 rounded-lg text-xs font-medium transition-colors ' +
                    (earnType === t ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400')}>
                  {t === 'fixed' ? 'Fixed Points' : 'By Amount'}
                </button>
              ))}
            </div>

            {earnType === 'fixed' ? (
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1.5 block">Points to award</label>
                <input value={points} onChange={e => setPoints(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 50" type="number" inputMode="numeric"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              </div>
            ) : (
              <div className="mb-4">
                <label className="text-xs text-gray-400 mb-1.5 block">Purchase amount (RM)</label>
                <input value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 35.00" type="number" inputMode="decimal"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              </div>
            )}

            <button onClick={generateQr}
              disabled={qrLoading || (earnType === 'fixed' ? !points : !amount)}
              className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: color }}>
              {qrLoading ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              {qrLoading ? 'Generating...' : 'Generate QR Code'}
            </button>

            {qrData && !receipt && (
              <div className="mt-5 flex flex-col items-center">
                <p className="text-xs text-gray-400 mb-3">Member scans this QR to earn points</p>
                <img src={qrData} alt="QR Code" className="w-48 h-48 rounded-xl border border-gray-100" />
                <p className="text-xs text-gray-300 mt-2">Expires in 5 minutes</p>
              </div>
            )}

            {/* Receipt after scan */}
            {receipt && (
              <div className="mt-5 border border-dashed border-gray-200 rounded-2xl p-5 text-center" id="pos-receipt">
                <p className="text-xs text-gray-400 font-medium">{receipt.companyName}</p>
                <div className="my-4">
                  <p className="text-xs text-gray-400">Points earned</p>
                  <p className="text-4xl font-bold text-emerald-600 my-1">+{receipt.points}</p>
                  <p className="text-sm text-gray-500">Balance: <span className="font-bold text-violet-600">{receipt.balance}</span> pts</p>
                  {receipt.name && <p className="text-xs text-gray-400 mt-1">{receipt.name}</p>}
                </div>
                <p className="text-xs text-gray-300">{new Date().toLocaleString()}</p>
                <button onClick={() => window.print()}
                  className="mt-4 flex items-center gap-1.5 mx-auto text-xs text-gray-400 hover:text-gray-600">
                  <Printer size={13} /> Print receipt
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stamp (lookup first) */}
        {tab === 'stamp' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-500 mb-4">Add Stamp</p>
            <div className="flex gap-2 mb-4">
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Member phone" type="tel" inputMode="tel"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              <button onClick={lookupMember} disabled={lookupLoading || !phone.trim()}
                className="px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: color }}>
                {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : 'Find'}
              </button>
            </div>
            {member && (
              <div className="mt-2">
                <div className="flex items-center justify-between py-3 border-t border-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{member.member?.name || phone}</p>
                    <p className="text-xs text-gray-400">{member.points ?? 0} pts · {member.tier}</p>
                  </div>
                  <button onClick={addStamp}
                    className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ backgroundColor: color }}>
                    + Stamp
                  </button>
                </div>
                {stampProgress && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {Array.from({ length: stampProgress.goal }).map((_: unknown, i: number) => (
                        <div key={i} className={'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs ' +
                          (i < stampProgress.count ? 'border-transparent text-white' : 'border-gray-200 text-gray-300')}
                          style={i < stampProgress.count ? { backgroundColor: color } : {}}>
                          {i < stampProgress.count ? '✓' : ''}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold" style={{ color }}>{stampProgress.count}</span>/{stampProgress.goal} stamps
                      {stampProgress.goal - stampProgress.count > 0 && (
                        <> · {stampProgress.goal - stampProgress.count} more for <span className="font-medium">{stampProgress.reward_text}</span></>
                      )}
                    </p>
                  </div>
                )}
                {stampMsg && (
                  <p className={'text-xs text-center mt-2 font-medium ' + (stampMsg.includes('complete') ? 'text-amber-600' : 'text-violet-600')}>
                    {stampMsg}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Redeem voucher */}
        {tab === 'redeem' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-500 mb-4">Redeem Voucher</p>
            <div className="flex gap-2 mb-4">
              <input value={voucherCode} onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherResult(null) }}
                placeholder="Voucher code" autoCapitalize="characters"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300 font-mono tracking-wider uppercase"
                onKeyDown={e => e.key === 'Enter' && redeemVoucher()} />
              <button onClick={redeemVoucher} disabled={voucherLoading || !voucherCode.trim()}
                className="px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: color }}>
                {voucherLoading ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
              </button>
            </div>
            {voucherResult && (
              <div className={'flex items-start gap-2 p-3 rounded-xl ' + (voucherResult.success ? 'bg-emerald-50' : 'bg-red-50')}>
                {voucherResult.success
                  ? <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  : <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />}
                <p className={'text-sm ' + (voucherResult.success ? 'text-emerald-700' : 'text-red-500')}>
                  {voucherResult.message}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-300 mt-4 text-center">Ask member to show the code from their portal</p>
          </div>
        )}

        {/* Lookup (with name search) */}
        {tab === 'lookup' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 mb-4">Search by Phone</p>
              <div className="flex gap-2">
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Phone number" type="tel" inputMode="tel"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
                <button onClick={lookupMember} disabled={lookupLoading || !phone.trim()}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: color }}>
                  {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : 'Find'}
                </button>
              </div>
              {member && (
                <div className="border-t border-gray-50 pt-3 mt-3">
                  <p className="text-sm font-medium text-gray-800">{member.member?.name || phone}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{phone}</p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Points</p>
                      <p className="text-xl font-bold text-gray-800">{member.points}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Tier</p>
                      <p className="text-xl font-bold text-gray-800 capitalize">{member.tier}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 mb-4">Search by Name</p>
              <div className="flex gap-2">
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchMembers()}
                  placeholder="Customer name…"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
                <button onClick={searchMembers} disabled={searchLoading || searchQ.length < 2}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: color }}>
                  {searchLoading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-3 divide-y divide-gray-50">
                  {searchResults.map(r => (
                    <div key={r.membership_id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{r.name || r.phone}</p>
                        <p className="text-xs text-gray-400">{r.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-violet-600">{r.points} pts</p>
                        <p className="text-xs text-gray-400 capitalize">{r.tier}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manager dashboard */}
        {tab === 'dashboard' && isManager && (
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-5 text-white">
              <p className="text-xs font-medium text-violet-200 mb-3">Today</p>
              {!dashStats ? (
                <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-white/50" /></div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'New Members', value: dashStats.today?.newMembers ?? 0 },
                    { label: 'QR Scans',    value: dashStats.today?.scans ?? 0 },
                    { label: 'Points Out',  value: dashStats.today?.pointsEarned ?? 0 },
                    { label: 'Vouchers',    value: dashStats.today?.vouchersRedeemed ?? 0 },
                  ].map(t => (
                    <div key={t.label} className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold">{t.value}</p>
                      <p className="text-xs text-violet-200 mt-0.5">{t.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {dashStats && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-medium text-gray-500 mb-3">All-time</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Members</p>
                    <p className="text-2xl font-bold text-gray-800">{dashStats.totalMembers}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Points Balance</p>
                    <p className="text-2xl font-bold text-gray-800">{dashStats.totalPointsBalance?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#pos-receipt) { display: none !important; }
          #pos-receipt { display: block !important; border: none; margin: 0; padding: 20px; }
        }
      `}</style>
    </div>
  )
}
