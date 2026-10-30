'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { useAuth } from '@/lib/auth-context'
import { Gift, Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react'

type Reward = {
  id: string; name: string; description: string | null
  points_cost: number; validity_days: number; min_tier: string; active: boolean
}

type FormState = { name: string; description: string; points_cost: string; validity_days: string; min_tier: string }
const empty: FormState = { name: '', description: '', points_cost: '', validity_days: '30', min_tier: 'bronze' }

export default function RewardsPage() {
  const { authFetch } = useAuth()
  const [rewards, setRewards]   = useState<Reward[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Reward | null>(null)
  const [form, setForm]         = useState<FormState>(empty)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function load() {
    setLoading(true)
    const r = await authFetch('/api/admin/rewards')
    const d = await r.json()
    setRewards(d.rewards || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null); setForm(empty); setError(''); setShowForm(true)
  }
  function openEdit(r: Reward) {
    setEditing(r)
    setForm({ name: r.name, description: r.description || '', points_cost: String(r.points_cost), validity_days: String(r.validity_days), min_tier: r.min_tier || 'bronze' })
    setError(''); setShowForm(true)
  }
  function close() { setShowForm(false); setEditing(null); setForm(empty) }

  async function save() {
    setError(''); setSaving(true)
    const body = { name: form.name, description: form.description, points_cost: Number(form.points_cost), validity_days: Number(form.validity_days), min_tier: form.min_tier }
    const r = editing
      ? await authFetch(`/api/admin/rewards/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await authFetch('/api/admin/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json()
    if (!r.ok) { setError(d.error || 'Failed to save'); setSaving(false); return }
    await load(); close()
    setSaving(false)
  }

  async function deactivate(id: string) {
    if (!confirm('Remove this reward?')) return
    await authFetch(`/api/admin/rewards/${id}`, { method: 'DELETE' })
    await load()
  }

  const active = rewards.filter(r => r.active)
  const inactive = rewards.filter(r => !r.active)

  return (
    <AdminShell>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Gift size={20} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Rewards Catalogue</h1>
              <p className="text-sm text-gray-400">Members redeem points for these rewards</p>
            </div>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium">
            <Plus size={16} /> Add Reward
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-violet-400" />
          </div>
        ) : active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Gift size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No rewards yet — add one to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Gift size={18} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                  {r.description && <p className="text-xs text-gray-400 truncate mt-0.5">{r.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-violet-600 font-medium">{r.points_cost} pts · {r.validity_days}d expiry</p>
                    {r.min_tier && r.min_tier !== 'bronze' && (
                      <span className={'text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ' +
                        (r.min_tier === 'gold' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-500')}>
                        {r.min_tier}+
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(r)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-violet-500 hover:border-violet-200 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deactivate(r.id)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-200 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-800">{editing ? 'Edit Reward' : 'New Reward'}</h2>
                <button onClick={close} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Reward name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Free Coffee, 10% Discount"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Description <span className="text-gray-300">(optional)</span></label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Additional details"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Points cost</label>
                    <input value={form.points_cost} onChange={e => setForm(f => ({ ...f, points_cost: e.target.value.replace(/\D/g, '') }))}
                      type="number" inputMode="numeric" placeholder="500"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Valid for (days)</label>
                    <input value={form.validity_days} onChange={e => setForm(f => ({ ...f, validity_days: e.target.value.replace(/\D/g, '') }))}
                      type="number" inputMode="numeric" placeholder="30"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Minimum tier required</label>
                  <div className="flex gap-2">
                    {(['bronze', 'silver', 'gold'] as const).map(t => (
                      <button key={t} type="button"
                        onClick={() => setForm(f => ({ ...f, min_tier: t }))}
                        className={'flex-1 py-2 rounded-xl text-xs font-medium border transition-colors capitalize ' +
                          (form.min_tier === t ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-400')}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

              <div className="flex gap-3 mt-5">
                <button onClick={close}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-500">Cancel</button>
                <button onClick={save}
                  disabled={saving || !form.name.trim() || !form.points_cost}
                  className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
