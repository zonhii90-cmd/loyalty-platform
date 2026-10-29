'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [companyId, setCompanyId] = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [err,       setErr]       = useState('')

  async function submit() {
    if (!companyId.trim() || !password.trim()) { setErr('Fill in all fields'); return }
    setLoading(true); setErr('')

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: companyId.trim(), password: password.trim() }),
    })
    const d = await res.json()
    if (!res.ok || d.error) { setErr(d.error || 'Invalid credentials'); setLoading(false); return }

    login(d.companyId, d.token, d.companyName)
    router.replace('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <p className="text-3xl font-bold text-violet-600 tracking-tight">Loyalty Platform</p>
          <p className="text-sm text-gray-400 mt-1">Member loyalty & rewards</p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={companyId}
            onChange={e => setCompanyId(e.target.value)}
            placeholder="Company ID"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300"
          />
          {err && <p className="text-xs text-red-500 text-center">{err}</p>}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-medium text-sm disabled:opacity-50 mt-1"
          >
            {loading ? '...' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  )
}
