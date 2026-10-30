'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import AdminShell from '@/components/AdminShell'
import { Settings, Palette, Link, Save, Loader2, CheckCircle } from 'lucide-react'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://loyalty-platform-beta-ebon.vercel.app'

const PRESET_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#dc2626',
  '#d97706', '#db2777', '#0891b2', '#374151',
]

export default function SettingsPage() {
  const { authFetch } = useAuth()
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [branding, setBranding] = useState({ slug: '', logo_url: '', primary_color: '#7c3aed' })
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    authFetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        setSettings(d.settings || {})
        if (d.branding) setBranding({ slug: d.branding.slug || '', logo_url: d.branding.logo_url || '', primary_color: d.branding.primary_color || '#7c3aed' })
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setError(''); setSaving(true)
    const slugClean = branding.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const r = await authFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, branding: { ...branding, slug: slugClean } }),
    })
    const d = await r.json()
    if (!r.ok) { setError(d.error || 'Failed to save'); setSaving(false); return }
    setBranding(b => ({ ...b, slug: slugClean }))
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const portalUrl = branding.slug ? `${APP_URL}/join/${branding.slug}` : ''

  if (loading) return (
    <AdminShell>
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="animate-spin text-violet-400" />
      </div>
    </AdminShell>
  )

  return (
    <AdminShell>
      <div className="p-6 max-w-2xl space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Settings size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-400">Configure your loyalty programme</p>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={16} className="text-violet-500" />
            <p className="text-sm font-semibold text-gray-700">Branding</p>
          </div>

          <div className="space-y-4">
            {/* Slug */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Programme URL slug</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-violet-300">
                <span className="px-3 py-2.5 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 whitespace-nowrap">{APP_URL}/join/</span>
                <input value={branding.slug}
                  onChange={e => setBranding(b => ({ ...b, slug: e.target.value }))}
                  placeholder="your-brand"
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Only lowercase letters, numbers, hyphens</p>
            </div>

            {/* Primary color */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Brand colour</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setBranding(b => ({ ...b, primary_color: c }))}
                    className={'w-8 h-8 rounded-full border-2 transition-transform ' + (branding.primary_color === c ? 'scale-110 border-gray-400' : 'border-transparent')}
                    style={{ backgroundColor: c }} />
                ))}
                <input type="color" value={branding.primary_color}
                  onChange={e => setBranding(b => ({ ...b, primary_color: e.target.value }))}
                  className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer p-0.5" />
                <span className="text-xs text-gray-400 font-mono">{branding.primary_color}</span>
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Logo URL <span className="text-gray-300">(optional)</span></label>
              <input value={branding.logo_url}
                onChange={e => setBranding(b => ({ ...b, logo_url: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              {branding.logo_url && (
                <img src={branding.logo_url} alt="Logo preview" className="mt-2 h-10 object-contain rounded" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>

            {/* Preview */}
            {branding.slug && (
              <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: branding.primary_color + '15' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: branding.primary_color }}>
                  {branding.slug.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">Member portal preview</p>
                  <p className="text-xs text-gray-400 truncate">{portalUrl}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Portal link */}
        {portalUrl && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Link size={16} className="text-violet-500" />
              <p className="text-sm font-semibold text-gray-700">Member Portal Link</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">Share this link or print it as a QR code for customers to access their account</p>
            <div className="flex gap-2">
              <input readOnly value={portalUrl}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-600 bg-gray-50 focus:outline-none" />
              <button onClick={() => navigator.clipboard?.writeText(portalUrl)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white"
                style={{ backgroundColor: branding.primary_color }}>
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Points rules */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Points Rules</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Points per RM1 spent (QR purchase mode)</label>
              <input type="number" min="0"
                value={settings.pointsPerRinggit || ''}
                onChange={e => setSettings(s => ({ ...s, pointsPerRinggit: Number(e.target.value) }))}
                placeholder="1"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Birthday bonus points</label>
              <input type="number" min="0"
                value={settings.birthdayPoints || ''}
                onChange={e => setSettings(s => ({ ...s, birthdayPoints: Number(e.target.value) }))}
                placeholder="50"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
            </div>
          </div>
        </div>

        {/* Tier thresholds */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Tier Thresholds (lifetime points)</p>
          <div className="space-y-3">
            {(['silver', 'gold'] as const).map(tier => (
              <div key={tier}>
                <label className="text-xs text-gray-400 mb-1.5 block capitalize">{tier} tier minimum</label>
                <input type="number" min="0"
                  value={settings[`tier_${tier}`] || ''}
                  onChange={e => setSettings(s => ({ ...s, [`tier_${tier}`]: Number(e.target.value) }))}
                  placeholder={tier === 'silver' ? '500' : '2000'}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 px-1">{error}</p>}

        <button onClick={save} disabled={saving}
          className="w-full py-3.5 rounded-2xl text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: branding.primary_color }}>
          {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle size={18} /> : <Save size={18} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </AdminShell>
  )
}
