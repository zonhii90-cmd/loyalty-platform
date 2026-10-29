'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import AdminShell from '@/components/AdminShell'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

export default function SettingsPage() {
  const { authFetch, companyId } = useAuth()
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    authFetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => setSettings(d.settings || {}))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    await authFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const portalUrl = `${APP_URL}/m?c=${companyId}`

  if (loading) return (
    <AdminShell>
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </AdminShell>
  )

  return (
    <AdminShell>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Settings</h1>

        {/* Customer portal link */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Customer Portal URL</p>
          <p className="text-xs text-gray-300 mb-2">Share this link / make a QR code for customers</p>
          <div className="flex gap-2">
            <input readOnly value={portalUrl}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-600 bg-gray-50 focus:outline-none" />
            <button onClick={() => navigator.clipboard?.writeText(portalUrl)}
              className="px-3 py-2 rounded-xl bg-violet-50 text-violet-600 text-xs font-medium">
              Copy
            </button>
          </div>
        </div>

        {/* Points rules */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Points Rules</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Points per purchase (RM1 = X pts)</label>
              <input type="number" min="0"
                value={settings.pointsPerRinggit || ''}
                onChange={e => setSettings(s => ({ ...s, pointsPerRinggit: Number(e.target.value) }))}
                placeholder="1"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Points for feedback completion</label>
              <input type="number" min="0"
                value={settings.pointsForFeedback || ''}
                onChange={e => setSettings(s => ({ ...s, pointsForFeedback: Number(e.target.value) }))}
                placeholder="10"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Birthday bonus points</label>
              <input type="number" min="0"
                value={settings.birthdayPoints || ''}
                onChange={e => setSettings(s => ({ ...s, birthdayPoints: Number(e.target.value) }))}
                placeholder="50"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
            </div>
          </div>
        </div>

        {/* Tier thresholds */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="text-xs font-medium text-gray-500 mb-3">Tier Thresholds (lifetime points)</p>
          <div className="flex flex-col gap-3">
            {['silver', 'gold'].map(tier => (
              <div key={tier}>
                <label className="text-xs text-gray-400 mb-1 block capitalize">{tier} threshold</label>
                <input type="number" min="0"
                  value={settings[`tier_${tier}`] || ''}
                  onChange={e => setSettings(s => ({ ...s, [`tier_${tier}`]: Number(e.target.value) }))}
                  placeholder={tier === 'silver' ? '500' : '2000'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              </div>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-violet-600 text-white font-medium disabled:opacity-50">
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Settings'}
        </button>
      </div>
    </AdminShell>
  )
}
