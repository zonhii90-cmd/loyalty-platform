'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AdminShell from '@/components/AdminShell'
import { useAuth } from '@/lib/auth-context'
import { Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

type Segment = 'all' | 'new' | 'active' | 'at_risk' | 'lapsed'

const SEGMENTS: { id: Segment; label: string; desc: string; emoji: string }[] = [
  { id: 'all',     label: 'All members',  desc: 'Everyone in your program',              emoji: '👥' },
  { id: 'new',     label: 'New',          desc: 'Joined in the last 14 days',            emoji: '🆕' },
  { id: 'active',  label: 'Active',       desc: 'Visited in the last 30 days',           emoji: '🔥' },
  { id: 'at_risk', label: 'At Risk',      desc: '30–90 days idle, still have points',    emoji: '⚠️' },
  { id: 'lapsed',  label: 'Lapsed',       desc: 'Over 90 days idle, still have points',  emoji: '💤' },
]

const TEMPLATES = [
  { label: 'Double points weekend',  text: '🌟 Double points this weekend at {company}! Earn 2× on every visit — Friday to Sunday only. See you soon!' },
  { label: 'New reward available',   text: '🎁 New reward just added at {company}! Check your app to see what you can redeem with your points.' },
  { label: 'We miss you',            text: "💛 We miss you at {company}! It's been a while. Come visit us and earn points on your next purchase." },
  { label: 'Birthday month bonus',   text: '🎂 Happy Birthday month! Enjoy 50 bonus points on your next visit to {company} — valid this month only.' },
]

function BroadcastInner() {
  const { authFetch } = useAuth()
  const [segment,   setSegment]   = useState<Segment>('all')
  const [message,   setMessage]   = useState('')
  const [estimate,  setEstimate]  = useState<number | null>(null)
  const [sending,   setSending]   = useState(false)
  const [result,    setResult]    = useState<{ sent: number; failed: number } | null>(null)
  const [error,     setError]     = useState('')

  useEffect(() => {
    setResult(null)
    authFetch(`/api/admin/broadcast?segment=${segment}`)
      .then(r => r.json())
      .then(d => setEstimate(d.total ?? null))
  }, [segment])

  async function send() {
    if (!message.trim()) return
    if (!confirm(`Send this message to ${estimate ?? '?'} members?`)) return
    setSending(true); setResult(null); setError('')
    const r = await authFetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim(), segment }),
    })
    const d = await r.json()
    setSending(false)
    if (!r.ok) { setError(d.error || 'Failed to send'); return }
    setResult(d)
  }

  return (
    <AdminShell>
      <div className="max-w-xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Send size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Broadcast Message</h1>
            <p className="text-sm text-gray-400">Send WhatsApp / SMS to your members</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">

          {/* Segment */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Send to</label>
            <div className="space-y-2">
              {SEGMENTS.map(s => (
                <button key={s.id} onClick={() => setSegment(s.id)}
                  className={'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ' +
                    (segment === s.id ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-gray-300')}>
                  <span className="text-base">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={'text-sm font-medium ' + (segment === s.id ? 'text-violet-700' : 'text-gray-700')}>{s.label}</p>
                    <p className="text-xs text-gray-400">{s.desc}</p>
                  </div>
                  {segment === s.id && estimate !== null && (
                    <span className="text-xs font-semibold text-violet-600 shrink-0">~{estimate}</span>
                  )}
                </button>
              ))}
            </div>
            {estimate !== null && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Estimated recipients: <span className="font-semibold text-gray-600">{estimate}</span>
              </p>
            )}
          </div>

          {/* Templates */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Quick templates</label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map(t => (
                <button key={t.label} onClick={() => setMessage(t.text)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Message</label>
              <span className={'text-xs ' + (message.length > 1000 ? 'text-red-400' : 'text-gray-300')}>{message.length}/1000</span>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 1000))}
              rows={5}
              placeholder="Type your message… Use {company} to insert your company name automatically."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300 resize-none"
            />
            <p className="text-xs text-gray-300 mt-1">Tip: {'{company}'} will be replaced with your business name</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {result && (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl">
              <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800">Message sent!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {result.sent} delivered{result.failed > 0 ? `, ${result.failed} failed` : ''}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={send}
            disabled={sending || !message.trim() || estimate === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Sending…' : `Send to ${estimate !== null ? `${estimate} members` : 'members'}`}
          </button>

        </div>
      </div>
    </AdminShell>
  )
}

export default function BroadcastPage() {
  return <Suspense><BroadcastInner /></Suspense>
}
