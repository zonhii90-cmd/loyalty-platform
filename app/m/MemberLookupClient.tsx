'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function MemberLookupClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const companyId    = searchParams.get('c') || ''

  const [phone,   setPhone]   = useState('')
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState('')

  async function lookup() {
    if (!phone.trim()) { setErr('Please enter your phone number'); return }
    if (!companyId)    { setErr('Missing company. Please scan the QR code again.'); return }
    setLoading(true); setErr('')

    const res = await fetch('/api/members/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim(), company_id: companyId, name: name.trim() || undefined }),
    })
    const d = await res.json()

    if (d.error) { setErr(d.error); setLoading(false); return }
    router.push('/m/' + encodeURIComponent(phone.trim()) + '?c=' + companyId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-2">🎁</p>
          <h1 className="text-2xl font-bold text-gray-800">My Rewards</h1>
          <p className="text-sm text-gray-400 mt-1">Enter your phone to check your points</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col gap-3">
            <input type="tel" value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="Phone number"
              autoFocus
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-center text-lg tracking-wider focus:outline-none focus:border-violet-300" />
            <input type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-center text-sm focus:outline-none focus:border-violet-300" />
            {err && <p className="text-xs text-red-500 text-center">{err}</p>}
            <button onClick={lookup} disabled={loading || !phone.trim()}
              className="w-full py-3.5 rounded-2xl bg-violet-600 text-white font-semibold disabled:opacity-40 mt-1">
              {loading ? '...' : 'Check Points →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
