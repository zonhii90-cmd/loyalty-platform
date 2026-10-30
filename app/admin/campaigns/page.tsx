'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { useAuth } from '@/lib/auth-context'
import { Zap, Plus, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'

interface Campaign {
  id: string; name: string; multiplier: string
  starts_at: string; ends_at: string; active: boolean
}

function isLive(c: Campaign) {
  const now = Date.now()
  return c.active && new Date(c.starts_at).getTime() <= now && new Date(c.ends_at).getTime() >= now
}

export default function CampaignsPage() {
  const { authFetch } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [form, setForm] = useState({ name: '', multiplier: '2', starts_at: '', ends_at: '' })

  function load() {
    authFetch('/api/admin/campaigns').then(r => r.json()).then(setCampaigns).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function create() {
    if (!form.name || !form.starts_at || !form.ends_at) return
    setSaving(true)
    await authFetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, multiplier: parseFloat(form.multiplier) }),
    })
    setSaving(false); setShowForm(false)
    setForm({ name: '', multiplier: '2', starts_at: '', ends_at: '' })
    load()
  }

  async function toggle(c: Campaign) {
    await authFetch(`/api/admin/campaigns/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    })
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this campaign?')) return
    await authFetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <AdminShell>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Zap size={20} className="text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
              <p className="text-sm text-gray-400">Double-points promotions</p>
            </div>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium">
            <Plus size={16} /> New
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <p className="text-xs font-medium text-gray-500 mb-4">New Campaign</p>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Campaign name (e.g. Raya Double Points)"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Multiplier</label>
                <div className="flex gap-2">
                  {['1.5', '2', '3'].map(v => (
                    <button key={v} onClick={() => setForm(f => ({ ...f, multiplier: v }))}
                      className={'flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ' +
                        (form.multiplier === v ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-600')}>
                      {v}×
                    </button>
                  ))}
                  <input type="number" step="0.5" min="1" max="10"
                    value={form.multiplier}
                    onChange={e => setForm(f => ({ ...f, multiplier: e.target.value }))}
                    className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none text-center" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Start</label>
                  <input type="datetime-local" value={form.starts_at}
                    onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">End</label>
                  <input type="datetime-local" value={form.ends_at}
                    onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                </div>
              </div>
              <button onClick={create} disabled={saving || !form.name || !form.starts_at || !form.ends_at}
                className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Campaign
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Zap size={28} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No campaigns yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => {
              const live = isLive(c)
              return (
                <div key={c.id} className={'bg-white rounded-2xl border p-4 flex items-center gap-3 ' + (live ? 'border-amber-200' : 'border-gray-100')}>
                  <div className={'w-2 h-2 rounded-full shrink-0 ' + (live ? 'bg-amber-400' : c.active ? 'bg-gray-300' : 'bg-gray-200')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <span className="text-xs font-bold text-amber-500">{parseFloat(c.multiplier)}×</span>
                      {live && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-medium">LIVE</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(c.starts_at).toLocaleDateString()} → {new Date(c.ends_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => toggle(c)} className="text-gray-400 hover:text-violet-600 transition-colors">
                    {c.active ? <ToggleRight size={22} className="text-violet-500" /> : <ToggleLeft size={22} />}
                  </button>
                  <button onClick={() => del(c.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
