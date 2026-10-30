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
interface Reward { id: string; name: string; description: string|null; points_cost: number; validity_days: number; min_tier: string }
interface Voucher {
  id: string; code: string; type: string; description: string
  expires_at: string|null; redeemed_at: string|null; created_at: string
}
interface PortalData {
  member: { phone: string; name: string|null; birthday: string|null }
  membership: { id: string; points: number; tier: string; joined_at: string; company_id: string }
  ledger: LedgerEntry[]
  stamp: StampProgress | null
  rewards: Reward[]
  vouchers: Voucher[]
}

const srcLabel: Record<string, string> = {
  manual: 'Manual adjustment', feedback: 'Feedback reward', purchase: 'Purchase reward',
  birthday: 'Birthday bonus', adjustment: 'Adjustment', referral: 'Referral bonus',
  qr_scan: 'QR Scan', stamp_redeem: 'Stamp reward',
}

const tierGrad: Record<string, string> = {
  bronze: 'from-amber-400 to-amber-600',
  silver: 'from-gray-400 to-gray-600',
  gold:   'from-yellow-400 to-yellow-600',
}

type Tab = 'overview' | 'rewards' | 'vouchers' | 'history'

export default function MemberPortalClient() {
  const { phone } = useParams<{ phone: string }>()
  const searchParams = useSearchParams()
  const router    = useRouter()
  const companyId = searchParams.get('c') || ''

  const [data,        setData]       = useState<PortalData | null>(null)
  const [loading,     setLoading]    = useState(true)
  const [err,         setErr]        = useState('')
  const [tab,         setTab]        = useState<Tab>('overview')
  const [pointsValue, setPointsValue]= useState<number | null>(null)
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const [redeemMsg, setRedeemMsg] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileBday, setProfileBday] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg]       = useState('')

  async function load() {
    if (!phone || !companyId) { setErr('Invalid link'); setLoading(false); return }

    const lookupRes = await fetch('/api/members/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: decodeURIComponent(phone), company_id: companyId }),
    })
    const d = await lookupRes.json()
    if (d.error) { setErr(d.error); setLoading(false); return }

    const [ledgerRes, stampRes, rewardsRes, vouchersRes, settingsRes] = await Promise.all([
      fetch('/api/members/' + d.membership.id + '/ledger'),
      fetch('/api/members/' + d.membership.id + '/stamps'),
      fetch('/api/rewards?company_id=' + companyId),
      fetch('/api/members/' + d.membership.id + '/vouchers'),
      fetch('/api/company/settings?id=' + companyId),
    ])
    const [ledgerData, stampData, rewardsData, vouchersData, settingsData] = await Promise.all([
      ledgerRes.json(), stampRes.json(), rewardsRes.json(), vouchersRes.json(), settingsRes.json(),
    ])
    if (settingsData.pointsValue) setPointsValue(settingsData.pointsValue)
    setData({
      member: d.member,
      membership: { ...d.membership, company_id: companyId },
      ledger:   ledgerData.ledger   || [],
      stamp:    stampData.stamp     || null,
      rewards:  rewardsData.rewards || [],
      vouchers: vouchersData.vouchers || [],
    })
    setProfileName(d.member.name || '')
    setProfileBday(d.member.birthday ? d.member.birthday.slice(0, 10) : '')
    setLoading(false)
  }

  useEffect(() => { load() }, [phone, companyId])

  async function redeemReward(reward: Reward) {
    if (!data) return
    setRedeeming(reward.id); setRedeemMsg('')
    const r = await fetch(`/api/members/${data.membership.id}/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId: reward.id }),
    })
    const resp = await r.json()
    setRedeeming(null)
    if (!r.ok) { setRedeemMsg(resp.error || 'Failed to redeem'); return }
    setRedeemMsg(`Voucher ${resp.voucher.code} created! Show it to staff.`)
    await load()
    setTab('vouchers')
  }

  async function saveProfile() {
    if (!data) return
    setProfileSaving(true); setProfileMsg('')
    const r = await fetch(`/api/members/${data.membership.id}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profileName.trim() || undefined, birthday: profileBday || undefined }),
    })
    setProfileSaving(false)
    if (!r.ok) { const e = await r.json(); setProfileMsg(e.error || 'Save failed'); return }
    setProfileMsg('Profile saved!')
    await load()
  }

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

  const { member, membership, ledger, stamp, rewards, vouchers } = data
  const grad = tierGrad[membership.tier] || tierGrad.bronze
  const activeVouchers = vouchers.filter(v => !v.redeemed_at && (!v.expires_at || new Date(v.expires_at) > new Date()))
  const usedVouchers   = vouchers.filter(v => v.redeemed_at || (v.expires_at && new Date(v.expires_at) <= new Date()))

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header card */}
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
        {/* Points balance */}
        <div className="bg-white rounded-3xl shadow-sm p-6 text-center mb-4">
          <p className="text-xs text-gray-400 mb-1">Your Points Balance</p>
          <p className="text-5xl font-bold text-violet-600">{membership.points}</p>
          {pointsValue && (
            <p className="text-sm text-violet-400 mt-1">≈ RM {(membership.points * pointsValue).toFixed(2)}</p>
          )}
          <p className="text-xs text-gray-300 mt-2">Member since {new Date(membership.joined_at).toLocaleDateString()}</p>
        </div>

        {/* Tab bar */}
        <div className="flex bg-white rounded-2xl border border-gray-100 p-1 mb-4 gap-1">
          {([
            ['overview',  'Home'],
            ['rewards',   `Rewards${rewards.length ? ` (${rewards.length})` : ''}`],
            ['vouchers',  `Vouchers${activeVouchers.length ? ` (${activeVouchers.length})` : ''}`],
            ['history',   'History'],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setRedeemMsg('') }}
              className={'flex-1 py-2 rounded-xl text-[11px] font-medium transition-colors ' +
                (tab === t ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-600')}>
              {label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <>
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

            {ledger.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-500">Recent Activity</p>
                  <button onClick={() => setTab('history')} className="text-xs text-violet-600">See all →</button>
                </div>
                <div className="flex flex-col divide-y divide-gray-50">
                  {ledger.slice(0, 5).map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">{srcLabel[entry.source] || entry.source}</p>
                        <p className="text-xs text-gray-300">{new Date(entry.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className={'text-base font-bold shrink-0 ' + (entry.amount > 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {entry.amount > 0 ? '+' : ''}{entry.amount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile edit */}
            <div className="bg-white rounded-3xl shadow-sm p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">My Profile</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Name</label>
                  <input
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Your name"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Birthday <span className="text-violet-500">(unlock birthday bonus!)</span></label>
                  <input
                    type="date"
                    value={profileBday}
                    onChange={e => setProfileBday(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                {profileMsg && (
                  <p className={'text-xs text-center ' + (profileMsg.includes('saved') ? 'text-emerald-600' : 'text-red-500')}>
                    {profileMsg}
                  </p>
                )}
                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {profileSaving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="bg-white rounded-3xl shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 mb-3">All Transactions</p>
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
        )}

        {/* Rewards tab */}
        {tab === 'rewards' && (
          <div className="space-y-3">
            {redeemMsg && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-sm text-emerald-700 text-center">
                {redeemMsg}
              </div>
            )}
            {rewards.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
                <p className="text-gray-300 text-sm">No rewards available yet</p>
              </div>
            ) : (
              rewards.map(r => {
                const TIER_RANK: Record<string, number> = { bronze: 0, silver: 1, gold: 2 }
                const tierOk    = (TIER_RANK[membership.tier] ?? 0) >= (TIER_RANK[r.min_tier ?? 'bronze'] ?? 0)
                const pointsOk  = membership.points >= r.points_cost
                const canRedeem = tierOk && pointsOk
                return (
                  <div key={r.id} className={'bg-white rounded-2xl border p-4 ' + (!tierOk ? 'border-gray-100 opacity-70' : 'border-gray-100')}>
                    <div className="flex items-start gap-3">
                      <div className={'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ' + (tierOk ? 'bg-violet-50' : 'bg-gray-100')}>
                        {tierOk ? '🎁' : '🔒'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                        {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-xs font-bold text-violet-600">{r.points_cost} points</p>
                          {r.min_tier && r.min_tier !== 'bronze' && (
                            <span className={'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ' +
                              (r.min_tier === 'gold' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500')}>
                              {r.min_tier}+
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => redeemReward(r)}
                      disabled={!canRedeem || redeeming === r.id}
                      className={'w-full mt-3 py-2.5 rounded-xl text-sm font-medium transition-colors ' +
                        (canRedeem
                          ? 'bg-violet-600 text-white hover:bg-violet-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                      {redeeming === r.id ? 'Redeeming…'
                        : !tierOk ? `Requires ${r.min_tier} tier`
                        : !pointsOk ? `Need ${r.points_cost - membership.points} more pts`
                        : 'Redeem Now'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Vouchers tab */}
        {tab === 'vouchers' && (
          <div className="space-y-3">
            {activeVouchers.length === 0 && usedVouchers.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
                <p className="text-gray-300 text-sm">No vouchers yet</p>
                {rewards.length > 0 && (
                  <button onClick={() => setTab('rewards')} className="text-violet-600 text-sm mt-2">Browse rewards →</button>
                )}
              </div>
            ) : (
              <>
                {activeVouchers.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-gray-500 px-1">Active</p>
                    {activeVouchers.map(v => (
                      <div key={v.id} className="bg-white rounded-2xl border border-violet-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
                            (v.type === 'stamp' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700')}>
                            {v.type === 'stamp' ? 'Stamp Reward' : 'Reward'}
                          </span>
                          {v.expires_at && (
                            <p className="text-xs text-gray-400">Exp {new Date(v.expires_at).toLocaleDateString()}</p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mb-2">{v.description}</p>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400 mb-1">Show this code to staff</p>
                          <p className="text-2xl font-bold tracking-widest text-violet-600 font-mono">{v.code}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {usedVouchers.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-gray-400 px-1 mt-2">Used / Expired</p>
                    {usedVouchers.map(v => (
                      <div key={v.id} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 opacity-60">
                        <div className="flex items-center justify-between mb-1">
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
          </div>
        )}
      </div>
    </div>
  )
}
