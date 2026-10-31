'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import StampCardVisual from '@/components/StampCardVisual'

type Company = { id: string; name: string; slug: string; logo_url: string | null; primary_color: string; require_phone_otp?: boolean }

interface LedgerEntry { id: string; type: string; amount: number; source: string; note: string | null; created_at: string }
interface StampProgress { count: number; completed_count: number; goal: number; reward_text: string; accent_color?: string; stamp_icon?: string; card_bg?: string }
interface Reward { id: string; name: string; description: string | null; points_cost: number; validity_days: number }
interface Voucher { id: string; code: string; type: string; description: string; expires_at: string | null; redeemed_at: string | null; created_at: string }
interface MemberData {
  member:     { phone: string; name: string | null }
  membership: { id: string; points: number; tier: string; joined_at: string }
  ledger:     LedgerEntry[]
  stamp:      StampProgress | null
  rewards:    Reward[]
  vouchers:   Voucher[]
}

const srcLabel: Record<string, string> = {
  manual: 'Adjustment', feedback: 'Feedback reward', purchase: 'Purchase',
  birthday: 'Birthday bonus', referral: 'Referral', qr_scan: 'QR Scan',
  stamp_redeem: 'Stamp reward', reward_redeem: 'Reward redeemed',
}

const tierGrad: Record<string, string> = {
  bronze: 'from-amber-400 to-amber-600',
  silver: 'from-gray-400 to-gray-600',
  gold:   'from-yellow-400 to-yellow-600',
}

type Tab = 'overview' | 'rewards' | 'vouchers'

function PortalContent() {
  const { slug } = useParams<{ slug: string }>()

  const [company,    setCompany]    = useState<Company | null>(null)
  const [notFound,   setNotFound]   = useState(false)
  const [phone,      setPhone]      = useState('')
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [tab,        setTab]        = useState<Tab>('overview')
  const [redeeming,  setRedeeming]  = useState<string | null>(null)
  const [redeemMsg,  setRedeemMsg]  = useState('')

  // Live update polling
  const memberDataRef = useRef<MemberData | null>(null)
  const [liveStampAnimIdx, setLiveStampAnimIdx] = useState<number | null>(null)
  const [liveStampAnimKey, setLiveStampAnimKey] = useState(0)
  const [newStampToast, setNewStampToast] = useState(false)

  useEffect(() => { memberDataRef.current = memberData }, [memberData])

  useEffect(() => {
    if (!memberData) return
    const id = memberData.membership.id
    const ph = memberData.member.phone

    const poll = setInterval(async () => {
      const curr = memberDataRef.current
      if (!curr) return
      try {
        const [sr, lr] = await Promise.all([
          fetch('/api/members/' + id + '/stamps'),
          fetch('/api/members/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: ph, slug }),
          }),
        ])
        if (!sr.ok || !lr.ok) return
        const [sd, ld] = await Promise.all([sr.json(), lr.json()])

        const newCount  = sd.stamp?.count  ?? 0
        const curCount  = curr.stamp?.count ?? 0
        const newPoints = ld.membership?.points ?? curr.membership.points
        const stampChanged  = newCount  > curCount
        const pointsChanged = newPoints !== curr.membership.points

        if (stampChanged || pointsChanged) {
          if (stampChanged) {
            setLiveStampAnimIdx(newCount - 1)
            setLiveStampAnimKey(k => k + 1)
            setTimeout(() => setLiveStampAnimIdx(null), 900)
            setNewStampToast(true)
            setTimeout(() => setNewStampToast(false), 3500)
          }
          const ledgerRes = await fetch('/api/members/' + id + '/ledger')
          const ledgerData = await ledgerRes.json()
          setMemberData(prev => prev ? {
            ...prev,
            membership: ld.membership || prev.membership,
            stamp:      sd.stamp      || prev.stamp,
            ledger:     ledgerData.ledger || prev.ledger,
          } : null)
        }
      } catch {}
    }, 4000)

    return () => clearInterval(poll)
  }, [memberData?.membership.id])

  // OTP flow
  const [otpStep,    setOtpStep]    = useState(false)
  const [otpCode,    setOtpCode]    = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpError,   setOtpError]   = useState('')
  const [otpVerifying, setOtpVerifying] = useState(false)

  // Load company branding
  useEffect(() => {
    fetch(`/api/company/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.company) setCompany(d.company); else setNotFound(true) })
      .catch(() => setNotFound(true))
  }, [slug])

  const color = company?.primary_color || '#7c3aed'

  async function requestOtp(ph: string) {
    if (!company || !slug) return
    setOtpSending(true); setOtpError('')
    const r = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: ph.trim(), slug }),
    })
    const d = await r.json()
    setOtpSending(false)
    if (!r.ok) { setOtpError(d.error || 'Failed to send code'); return }
    setOtpStep(true)
  }

  async function verifyOtp() {
    if (!slug || !otpCode.trim()) return
    setOtpVerifying(true); setOtpError('')
    const r = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), slug, code: otpCode.trim() }),
    })
    const d = await r.json()
    setOtpVerifying(false)
    if (!r.ok) { setOtpError(d.error || 'Invalid code'); return }
    setOtpStep(false)
    await loadMember(phone)
  }

  async function handlePhoneSubmit() {
    if (!company || phone.trim().length < 6) return
    if (company.require_phone_otp) {
      await requestOtp(phone)
    } else {
      await loadMember(phone)
    }
  }

  async function loadMember(ph: string) {
    if (!company || ph.trim().length < 6) return
    setLoading(true)
    const lookupRes = await fetch('/api/members/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: ph.trim(), slug }),
    })
    const d = await lookupRes.json()
    if (d.error) { setLoading(false); return }

    const [ledgerRes, stampRes, rewardsRes, vouchersRes] = await Promise.all([
      fetch('/api/members/' + d.membership.id + '/ledger'),
      fetch('/api/members/' + d.membership.id + '/stamps'),
      fetch('/api/rewards?company_id=' + company.id),
      fetch('/api/members/' + d.membership.id + '/vouchers'),
    ])
    const [ld, sd, rd, vd] = await Promise.all([
      ledgerRes.json(), stampRes.json(), rewardsRes.json(), vouchersRes.json(),
    ])
    setMemberData({
      member:     d.member,
      membership: d.membership,
      ledger:     ld.ledger   || [],
      stamp:      sd.stamp    || null,
      rewards:    rd.rewards  || [],
      vouchers:   vd.vouchers || [],
    })
    setLoading(false)
  }

  async function redeemReward(reward: Reward) {
    if (!memberData) return
    setRedeeming(reward.id); setRedeemMsg('')
    const r = await fetch(`/api/members/${memberData.membership.id}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId: reward.id }),
    })
    const resp = await r.json()
    setRedeeming(null)
    if (!r.ok) { setRedeemMsg(resp.error || 'Failed'); return }
    setRedeemMsg(`Voucher ${resp.voucher.code} ready! Show it to staff.`)
    await loadMember(memberData.member.phone)
    setTab('vouchers')
  }

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-gray-400 text-sm">Program not found</p>
    </div>
  )

  if (!company) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const companyHeader = (
    <div className="mb-8 text-center">
      {company.logo_url ? (
        <img src={company.logo_url} alt={company.name} className="h-16 mx-auto mb-3 object-contain" />
      ) : (
        <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold"
          style={{ backgroundColor: color }}>
          {company.name.charAt(0).toUpperCase()}
        </div>
      )}
      <h1 className="text-xl font-bold text-gray-800">{company.name}</h1>
      <p className="text-sm text-gray-400 mt-1">Loyalty Programme</p>
    </div>
  )

  // OTP verification screen
  if (otpStep) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F5F3' }}>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {companyHeader}
        <div className="w-full max-w-xs bg-white rounded-3xl border border-gray-100 p-6">
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl"
              style={{ backgroundColor: color + '15' }}>
              💬
            </div>
            <p className="text-sm font-semibold text-gray-800">Verify your number</p>
            <p className="text-xs text-gray-400 mt-1">
              A 6-digit code was sent to <span className="font-medium text-gray-600">{phone}</span> via WhatsApp
            </p>
          </div>
          <input
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && verifyOtp()}
            placeholder="000000"
            type="tel" inputMode="numeric"
            maxLength={6}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-lg text-center font-mono tracking-widest focus:outline-none mb-3"
          />
          {otpError && <p className="text-xs text-red-500 text-center mb-3">{otpError}</p>}
          <button
            onClick={verifyOtp}
            disabled={otpVerifying || otpCode.length !== 6}
            className="w-full py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
            style={{ backgroundColor: color }}>
            {otpVerifying
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Verify'}
          </button>
          <button
            onClick={() => requestOtp(phone)}
            disabled={otpSending}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40">
            {otpSending ? 'Sending…' : 'Resend code'}
          </button>
          <button
            onClick={() => { setOtpStep(false); setOtpCode(''); setOtpError('') }}
            className="w-full py-2 text-xs text-gray-300 hover:text-gray-500 mt-1">
            ← Change number
          </button>
        </div>
      </div>
    </div>
  )

  // Phone entry screen
  if (!memberData) return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F5F3' }}>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {companyHeader}

        <div className="w-full max-w-xs bg-white rounded-3xl border border-gray-100 p-6">
          <p className="text-sm font-medium text-gray-700 mb-4 text-center">Enter your phone number</p>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
            placeholder="+60 12 345 6789"
            type="tel" inputMode="tel"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none mb-3"
            style={{ '--tw-ring-color': color } as React.CSSProperties}
          />
          <button
            onClick={handlePhoneSubmit}
            disabled={loading || otpSending || phone.trim().length < 6}
            className="w-full py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: color }}>
            {(loading || otpSending)
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : company.require_phone_otp ? 'Send Verification Code' : 'View My Account'}
          </button>
          <p className="text-xs text-center text-gray-300 mt-3">New members are registered automatically</p>
        </div>
      </div>
    </div>
  )

  // Member dashboard
  const { member, membership, ledger, stamp, rewards, vouchers } = memberData
  const grad = tierGrad[membership.tier] || tierGrad.bronze
  const activeVouchers = vouchers.filter(v => !v.redeemed_at && (!v.expires_at || new Date(v.expires_at) > new Date()))
  const usedVouchers   = vouchers.filter(v => v.redeemed_at || (v.expires_at && new Date(v.expires_at) <= new Date()))

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#F5F5F3' }}>
      {/* Header */}
      <div className={`bg-gradient-to-br ${grad} text-white px-4 pt-10 pb-10`}>
        <div className="max-w-sm mx-auto">
          {company.logo_url && (
            <div className="flex justify-center mb-4">
              <img src={company.logo_url} alt={company.name} className="h-8 object-contain opacity-80" />
            </div>
          )}
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold mx-auto mb-2">
              {(member.name || member.phone).charAt(0).toUpperCase()}
            </div>
            <p className="font-bold text-lg">{member.name || member.phone}</p>
            {member.name && <p className="text-white/70 text-xs mt-0.5">{member.phone}</p>}
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold capitalize">
              {membership.tier} Member
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 -mt-4 space-y-4">
        {/* Points card */}
        <div className="bg-white rounded-3xl shadow-sm p-6 text-center">
          <p className="text-xs text-gray-400 mb-1">Points Balance</p>
          <p className="text-5xl font-bold" style={{ color }}>{membership.points}</p>
          <p className="text-xs text-gray-300 mt-2">Since {new Date(membership.joined_at).toLocaleDateString()}</p>
          <button onClick={() => { setMemberData(null); setPhone('') }}
            className="mt-3 text-xs text-gray-300 hover:text-gray-400">← Switch account</button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl border border-gray-100 p-1 gap-1">
          {([['overview', 'Overview'], ['rewards', `Rewards${rewards.length ? ` (${rewards.length})` : ''}`], ['vouchers', `Vouchers${activeVouchers.length ? ` (${activeVouchers.length})` : ''}`]] as const).map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setRedeemMsg('') }}
              className={'flex-1 py-2 rounded-xl text-xs font-medium transition-colors ' +
                (tab === t ? 'text-white' : 'text-gray-400')}
              style={tab === t ? { backgroundColor: color } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <>
            {/* New stamp toast */}
            {newStampToast && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg flex items-center gap-2"
                style={{ backgroundColor: stamp?.accent_color || color }}>
                <span>⭐</span> New stamp added!
              </div>
            )}

            {stamp && (
              <StampCardVisual
                count={stamp.count}
                goal={stamp.goal}
                reward_text={stamp.reward_text}
                accent_color={stamp.accent_color || color}
                stamp_icon={stamp.stamp_icon}
                card_bg={stamp.card_bg as any}
                completed_count={stamp.completed_count}
                newStampIndex={liveStampAnimIdx}
                animKey={liveStampAnimKey}
              />
            )}
            <div className="bg-white rounded-2xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">Points History</p>
              {ledger.length === 0 ? (
                <p className="text-center py-6 text-gray-300 text-sm">No history yet</p>
              ) : ledger.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 py-3 border-t border-gray-50 first:border-0">
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
          </>
        )}

        {/* Rewards */}
        {tab === 'rewards' && (
          <>
            {redeemMsg && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-sm text-emerald-700 text-center">{redeemMsg}</div>
            )}
            {rewards.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <p className="text-gray-300 text-sm">No rewards available yet</p>
              </div>
            ) : rewards.map(r => {
              const canRedeem = membership.points >= r.points_cost
              return (
                <div key={r.id} className="bg-white rounded-2xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                      style={{ backgroundColor: color + '20' }}>🎁</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                      {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                      <p className="text-xs font-bold mt-1" style={{ color }}>{r.points_cost} points</p>
                    </div>
                  </div>
                  <button onClick={() => redeemReward(r)} disabled={!canRedeem || redeeming === r.id}
                    className={'w-full py-2.5 rounded-xl text-sm font-medium ' + (canRedeem ? 'text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}
                    style={canRedeem ? { backgroundColor: color } : {}}>
                    {redeeming === r.id ? 'Redeeming…' : canRedeem ? 'Redeem Now' : `Need ${r.points_cost - membership.points} more pts`}
                  </button>
                </div>
              )
            })}
          </>
        )}

        {/* Vouchers */}
        {tab === 'vouchers' && (
          <>
            {activeVouchers.length === 0 && usedVouchers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <p className="text-gray-300 text-sm">No vouchers yet</p>
                {rewards.length > 0 && (
                  <button onClick={() => setTab('rewards')} className="text-sm mt-2" style={{ color }}>Browse rewards →</button>
                )}
              </div>
            ) : (
              <>
                {activeVouchers.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-gray-500 px-1">Active</p>
                    {activeVouchers.map(v => (
                      <div key={v.id} className="bg-white rounded-2xl border p-4" style={{ borderColor: color + '40' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: color + '15', color }}>
                            {v.type === 'stamp' ? 'Stamp Reward' : 'Reward'}
                          </span>
                          {v.expires_at && <p className="text-xs text-gray-400">Exp {new Date(v.expires_at).toLocaleDateString()}</p>}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mb-2">{v.description}</p>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400 mb-1">Show this code to staff</p>
                          <p className="text-2xl font-bold tracking-widest font-mono" style={{ color }}>{v.code}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {usedVouchers.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-gray-400 px-1 mt-1">Used / Expired</p>
                    {usedVouchers.map(v => (
                      <div key={v.id} className="bg-gray-50 rounded-2xl p-4 opacity-60">
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-medium text-gray-600">{v.description}</p>
                          <span className="text-xs text-gray-400">{v.redeemed_at ? 'Used' : 'Expired'}</span>
                        </div>
                        <p className="text-lg font-mono text-gray-400 line-through">{v.code}</p>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PortalContent />
    </Suspense>
  )
}
