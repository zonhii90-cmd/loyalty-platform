'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStaff } from '@/lib/staff-context'

export default function PosLoginPage() {
  const router = useRouter()
  const { isLoggedIn, login } = useStaff()
  const [companyId, setCompanyId] = useState('')
  const [pin, setPin]             = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (isLoggedIn) router.replace('/pos/screen')
  }, [isLoggedIn])

  function pressDigit(d: string) {
    if (pin.length < 4) setPin(p => p + d)
  }

  function backspace() { setPin(p => p.slice(0, -1)) }

  async function submit() {
    if (!companyId.trim() || pin.length !== 4) return
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/admin/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: companyId.trim().toLowerCase(), pin }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Invalid PIN'); setPin(''); setLoading(false); return }
      login(d)
      router.replace('/pos/screen')
    } catch {
      setError('Connection error'); setPin(''); setLoading(false)
    }
  }

  useEffect(() => { if (pin.length === 4) submit() }, [pin])

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <h1 className="text-2xl font-bold text-violet-600 text-center mb-1">Loyalty Platform</h1>
        <p className="text-sm text-gray-400 text-center mb-8">Staff Login</p>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="mb-5">
            <label className="text-xs text-gray-500 font-medium block mb-1.5">Company ID</label>
            <input value={companyId} onChange={e => setCompanyId(e.target.value)}
              placeholder="e.g. loyatly"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
          </div>

          <label className="text-xs text-gray-500 font-medium block mb-3">Enter PIN</label>
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={'w-10 h-10 rounded-full border-2 flex items-center justify-center ' +
                (i < pin.length ? 'bg-violet-600 border-violet-600' : 'border-gray-200')}>
                {i < pin.length && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-500 text-center mb-4">{error}</p>}

          <div className="grid grid-cols-3 gap-3">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
              <button key={i} disabled={loading || d === ''}
                onClick={() => d === '⌫' ? backspace() : pressDigit(d)}
                className={'py-4 rounded-2xl text-lg font-medium transition-colors ' +
                  (d === '' ? 'pointer-events-none' :
                  d === '⌫' ? 'bg-gray-100 text-gray-500 active:bg-gray-200' :
                  'bg-gray-50 text-gray-800 active:bg-violet-50 active:text-violet-600')}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
