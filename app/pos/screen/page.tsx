'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStaff } from '@/lib/staff-context'
import { QrCode, Stamp, Search, LogOut, Loader2 } from 'lucide-react'

type Tab = 'qr' | 'stamp' | 'lookup'

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
  const [stampMsg, setStampMsg] = useState('')

  useEffect(() => {
    if (!isLoggedIn) router.replace('/pos')
  }, [isLoggedIn])

  if (!isLoggedIn) return null

  const color = primaryColor || '#7c3aed'

  async function generateQr() {
    setQrLoading(true); setQrData(null)
    const body = earnType === 'fixed'
      ? { earnType, points: Number(points), companyId }
      : { earnType, amount: Number(amount), companyId }
    const r = await fetch('/api/pos/qr/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-staff-id': useStaffId(),
        'x-staff-company-id': companyId || '',
      },
      body: JSON.stringify(body),
    })
    const d = await r.json()
    if (r.ok) setQrData(d.qrUrl)
    setQrLoading(false)
  }

  function useStaffId() {
    try { return JSON.parse(localStorage.getItem('lp_staff') || '{}').staffId || '' } catch { return '' }
  }

  async function lookupMember() {
    if (!phone.trim()) return
    setLookupLoading(true); setMember(null)
    const r = await fetch('/api/members/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-staff-id': useStaffId(),
        'x-staff-company-id': companyId || '',
      },
      body: JSON.stringify({ phone: phone.trim(), companyId }),
    })
    const d = await r.json()
    if (r.ok) setMember(d)
    setLookupLoading(false)
  }

  async function addStamp() {
    if (!member) return
    setStampMsg('')
    const r = await fetch('/api/pos/stamp/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-staff-id': useStaffId(),
        'x-staff-company-id': companyId || '',
      },
      body: JSON.stringify({ membershipId: member.membershipId }),
    })
    const d = await r.json()
    setStampMsg(d.message || (r.ok ? 'Stamp added!' : d.error || 'Error'))
    if (r.ok) lookupMember()
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'qr',     label: 'Generate QR', icon: <QrCode size={20} /> },
    { id: 'stamp',  label: 'Add Stamp',   icon: <Stamp size={20} /> },
    { id: 'lookup', label: 'Look up',     icon: <Search size={20} /> },
  ]

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color }}>{companyName}</p>
          <p className="text-xs text-gray-400">{staffName}</p>
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
                <button key={t} onClick={() => { setEarnType(t); setQrData(null) }}
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

            {qrData && (
              <div className="mt-5 flex flex-col items-center">
                <p className="text-xs text-gray-400 mb-3">Member scans this QR to earn points</p>
                <img src={qrData} alt="QR Code" className="w-48 h-48 rounded-xl border border-gray-100" />
                <p className="text-xs text-gray-300 mt-2">Expires in 5 minutes</p>
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
                    <p className="text-xs text-gray-400">{member.points} pts · {member.stamps ?? 0} stamps</p>
                  </div>
                  <button onClick={addStamp}
                    className="px-4 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ backgroundColor: color }}>
                    + Stamp
                  </button>
                </div>
                {stampMsg && <p className="text-xs text-center mt-2 text-violet-600">{stampMsg}</p>}
              </div>
            )}
          </div>
        )}

        {/* Lookup */}
        {tab === 'lookup' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-500 mb-4">Look Up Member</p>
            <div className="flex gap-2 mb-4">
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
              <div className="border-t border-gray-50 pt-3">
                <p className="text-sm font-medium text-gray-800">{member.member?.name || phone}</p>
                <p className="text-xs text-gray-400 mt-0.5">{phone}</p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Points</p>
                    <p className="text-xl font-bold text-gray-800">{member.points}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Stamps</p>
                    <p className="text-xl font-bold text-gray-800">{member.stamps ?? '—'}</p>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400 mt-3 capitalize">{member.tier} tier</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
