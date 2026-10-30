'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import StampCardVisual, { CardBg } from '@/components/StampCardVisual'
import { useAuth } from '@/lib/auth-context'
import { Save, Trash2, Loader2, CheckCircle } from 'lucide-react'

type StampCard = {
  id: string; goal: number; reward_text: string; earn_mode: 'qr' | 'manual'; active: boolean
  accent_color: string; stamp_icon: string; card_bg: CardBg
}

const PRESET_COLORS = ['#F59E0B', '#7C3AED', '#10B981', '#EF4444', '#3B82F6', '#EC4899']
const PRESET_ICONS  = ['★', '☕', '🍦', '🌟', '🎯', '💎', '🌸', '🍕']
const BG_OPTIONS: { id: CardBg; label: string; desc: string }[] = [
  { id: 'white',    label: 'White',    desc: 'Clean & minimal' },
  { id: 'gradient', label: 'Warm',     desc: 'White → gold gradient' },
  { id: 'dark',     label: 'Premium',  desc: 'Dark slate with gold' },
]

export default function StampCardPage() {
  const { authFetch } = useAuth()
  const [card,        setCard]        = useState<StampCard | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState('')

  const [goal,        setGoal]        = useState('10')
  const [rewardText,  setRewardText]  = useState('')
  const [earnMode,    setEarnMode]    = useState<'qr' | 'manual'>('qr')
  const [accentColor, setAccentColor] = useState('#F59E0B')
  const [stampIcon,   setStampIcon]   = useState('★')
  const [cardBg,      setCardBg]      = useState<CardBg>('white')

  async function load() {
    setLoading(true)
    const r = await authFetch('/api/admin/stamp-card')
    const d = await r.json()
    if (r.ok && d.stampCard) {
      const sc: StampCard = d.stampCard
      setCard(sc)
      setGoal(String(sc.goal))
      setRewardText(sc.reward_text)
      setEarnMode(sc.earn_mode)
      setAccentColor(sc.accent_color || '#F59E0B')
      setStampIcon(sc.stamp_icon || '★')
      setCardBg((sc.card_bg as CardBg) || 'white')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    setError(''); setSaved(false); setSaving(true)
    const r = await authFetch('/api/admin/stamp-card', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: Number(goal), reward_text: rewardText, earn_mode: earnMode,
        accent_color: accentColor, stamp_icon: stampIcon, card_bg: cardBg,
      }),
    })
    const d = await r.json()
    if (!r.ok) { setError(d.error || 'Failed to save'); setSaving(false); return }
    setCard(d.stampCard)
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function deactivate() {
    if (!confirm('Deactivate the stamp card? Members will keep their progress.')) return
    await authFetch('/api/admin/stamp-card', { method: 'DELETE' })
    setCard(null)
    setGoal('10'); setRewardText(''); setEarnMode('qr')
    setAccentColor('#F59E0B'); setStampIcon('★'); setCardBg('white')
  }

  const previewGoal = Math.max(2, Number(goal) || 10)
  const previewCount = Math.min(3, previewGoal)

  return (
    <AdminShell>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: accentColor + '22' }}>
            {stampIcon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Stamp Card</h1>
            <p className="text-sm text-gray-400">Design your loyalty stamp card</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-violet-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* LEFT: Config */}
            <div className="space-y-5">

              {/* Status badge */}
              {card && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Stamp card is active</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {card.goal} stamps · {card.earn_mode === 'qr' ? 'QR scan' : 'Manual by staff'}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">

                {/* Earn mode */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">How stamps are earned</label>
                  <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
                    {([['qr', 'QR Scan', 'Member scans QR code from staff'], ['manual', 'Manual', 'Staff taps "+ Stamp" on POS']] as const).map(([val, label, desc]) => (
                      <button key={val} onClick={() => setEarnMode(val)}
                        className={'flex-1 py-2.5 px-3 rounded-lg text-left transition-colors ' +
                          (earnMode === val ? 'bg-white shadow-sm' : 'text-gray-400')}>
                        <p className={'text-xs font-medium ' + (earnMode === val ? 'text-gray-800' : '')}>{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Goal */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Stamps to complete</label>
                  <div className="flex items-center gap-3">
                    <input value={goal} onChange={e => setGoal(e.target.value.replace(/\D/g, ''))}
                      type="number" inputMode="numeric" min="2" max="50"
                      className="w-24 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-center font-bold focus:outline-none focus:border-violet-300" />
                    <p className="text-sm text-gray-400">stamps per card</p>
                  </div>
                </div>

                {/* Reward */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Reward when complete</label>
                  <input value={rewardText} onChange={e => setRewardText(e.target.value)}
                    placeholder="e.g. Free drink, 10% off next purchase"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
                </div>

              </div>

              {/* Design */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
                <p className="text-sm font-semibold text-gray-700">Card Design</p>

                {/* Accent color */}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">Accent color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => setAccentColor(c)}
                        className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          outline: accentColor === c ? `3px solid ${c}` : 'none',
                          outlineOffset: '2px',
                        }} />
                    ))}
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent p-0"
                      title="Custom color" />
                  </div>
                </div>

                {/* Stamp icon */}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">Stamp icon</label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {PRESET_ICONS.map(ic => (
                      <button key={ic} onClick={() => setStampIcon(ic)}
                        className={'w-9 h-9 rounded-xl text-base flex items-center justify-center transition-colors ' +
                          (stampIcon === ic ? 'text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600')}
                        style={stampIcon === ic ? { backgroundColor: accentColor } : {}}>
                        {ic}
                      </button>
                    ))}
                  </div>
                  <input value={stampIcon} onChange={e => setStampIcon(e.target.value.slice(0, 4))}
                    placeholder="Custom emoji or symbol"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
                </div>

                {/* Card background */}
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">Card background</label>
                  <div className="flex gap-2">
                    {BG_OPTIONS.map(opt => (
                      <button key={opt.id} onClick={() => setCardBg(opt.id)}
                        className={'flex-1 py-2.5 px-2 rounded-xl border text-center transition-colors ' +
                          (cardBg === opt.id ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-gray-300')}>
                        <p className={'text-xs font-medium ' + (cardBg === opt.id ? 'text-violet-700' : 'text-gray-700')}>{opt.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3">
                <button onClick={save}
                  disabled={saving || !rewardText.trim() || Number(goal) < 2}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
                  {saving ? 'Saving…' : saved ? 'Saved!' : card ? 'Update Card' : 'Activate Card'}
                </button>
                {card && (
                  <button onClick={deactivate}
                    className="px-4 py-3 rounded-xl border border-gray-200 text-gray-400 hover:text-red-400 hover:border-red-200 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT: Live preview */}
            <div className="md:sticky md:top-6 self-start">
              <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">Live Preview</p>
              {Number(goal) >= 2 && rewardText ? (
                <StampCardVisual
                  count={previewCount}
                  goal={previewGoal}
                  reward_text={rewardText}
                  accent_color={accentColor}
                  stamp_icon={stampIcon || '★'}
                  card_bg={cardBg}
                />
              ) : (
                <div className="bg-gray-50 rounded-3xl p-8 text-center border border-dashed border-gray-200">
                  <p className="text-gray-300 text-sm">Enter a reward and goal to preview</p>
                </div>
              )}
              {Number(goal) >= 2 && rewardText && (
                <p className="text-center text-xs text-gray-300 mt-3">
                  Showing {previewCount} / {previewGoal} earned
                </p>
              )}
            </div>

          </div>
        )}
      </div>
    </AdminShell>
  )
}
