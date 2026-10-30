'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Stamp } from 'lucide-react'

function ScanContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('t') || ''

  const [step, setStep]     = useState<'phone' | 'loading' | 'success' | 'error'>('phone')
  const [phone, setPhone]   = useState('')
  const [name, setName]     = useState('')
  const [result, setResult] = useState<any>(null)
  const [errMsg, setErrMsg] = useState('')

  async function claim() {
    if (!phone.trim() || phone.trim().length < 6) return
    setStep('loading')
    try {
      const r = await fetch('/api/members/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, phone: phone.trim(), name: name.trim() || undefined }),
      })
      const d = await r.json()
      if (!r.ok) { setErrMsg(d.error || 'Something went wrong'); setStep('error'); return }
      setResult(d)
      setStep('success')
    } catch {
      setErrMsg('Network error'); setStep('error')
    }
  }

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-gray-400 text-sm">Invalid QR code</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs">

        {step === 'phone' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎁</span>
              </div>
              <h1 className="text-lg font-bold text-gray-800">Claim Your Points</h1>
              <p className="text-xs text-gray-400 mt-1">Enter your phone number to earn</p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1.5">Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+60 12 345 6789" type="tel" inputMode="tel"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1.5">Your Name <span className="text-gray-300">(optional)</span></label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ahmad"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              </div>
              <button onClick={claim} disabled={phone.trim().length < 6}
                className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-40 mt-1">
                Claim Points
              </button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-400">Crediting your points...</p>
          </div>
        )}

        {step === 'success' && result && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-800 mb-1">+{result.points} Points!</h2>
            <p className="text-sm text-gray-400 mb-4">
              New balance: <span className="font-bold text-violet-600">{result.balance} pts</span>
            </p>

            {result.stamp && (
              <div className={'rounded-xl p-3 mb-4 ' + (result.stamp.completed ? 'bg-yellow-50 border border-yellow-200' : 'bg-violet-50')}>
                {result.stamp.completed ? (
                  <>
                    <p className="text-sm font-bold text-yellow-700">🎉 Stamp Card Complete!</p>
                    <p className="text-xs text-yellow-600 mt-0.5">Reward: {result.stamp.rewardText}</p>
                    <p className="text-xs text-yellow-500 mt-1">Show staff your voucher</p>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Stamp size={14} className="text-violet-500 shrink-0" />
                    <p className="text-xs text-violet-700">
                      Stamp {result.stamp.count}/{result.stamp.goal} — {result.stamp.goal - result.stamp.count} more for {result.stamp.rewardText}
                    </p>
                  </div>
                )}
              </div>
            )}

            {result.isNew && (
              <p className="text-xs text-gray-400 mb-4">Welcome! Your account has been created.</p>
            )}

            <p className="text-xs text-gray-300">You can close this page</p>
          </div>
        )}

        {step === 'error' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <XCircle size={48} className="text-red-400 mx-auto mb-3" />
            <h2 className="text-base font-bold text-gray-800 mb-1">Could not claim points</h2>
            <p className="text-sm text-gray-400 mb-4">{errMsg}</p>
            <button onClick={() => { setStep('phone'); setErrMsg('') }}
              className="text-violet-600 text-sm font-medium">Try again</button>
          </div>
        )}

      </div>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ScanContent />
    </Suspense>
  )
}
