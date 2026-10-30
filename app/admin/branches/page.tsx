'use client'

import { useEffect, useState } from 'react'
import AdminShell from '@/components/AdminShell'
import { useAuth } from '@/lib/auth-context'
import { MapPin, Plus, Trash2, Loader2, Users } from 'lucide-react'

interface Branch { id: string; name: string; location: string | null; active: boolean; staff_count: number }

export default function BranchesPage() {
  const { authFetch } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({ name: '', location: '' })

  function load() {
    authFetch('/api/admin/branches').then(r => r.json()).then(setBranches).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function create() {
    if (!form.name.trim()) return
    setSaving(true)
    await authFetch('/api/admin/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false); setShowForm(false); setForm({ name: '', location: '' }); load()
  }

  async function del(id: string) {
    if (!confirm('Delete this branch? Staff will be unassigned.')) return
    await authFetch(`/api/admin/branches/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <AdminShell>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <MapPin size={20} className="text-teal-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Branches</h1>
              <p className="text-sm text-gray-400">Multi-location management</p>
            </div>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium">
            <Plus size={16} /> Add Branch
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
            <p className="text-xs font-medium text-gray-500 mb-4">New Branch</p>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Branch name (e.g. KL Sentral)"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Address or location (optional)"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              <button onClick={create} disabled={saving || !form.name.trim()}
                className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Branch
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
        ) : branches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <MapPin size={28} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No branches yet — your whole programme is company-wide</p>
          </div>
        ) : (
          <div className="space-y-3">
            {branches.map(b => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-teal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{b.name}</p>
                  {b.location && <p className="text-xs text-gray-400 truncate">{b.location}</p>}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Users size={10} className="text-gray-300" />
                    <p className="text-xs text-gray-300">{b.staff_count} staff</p>
                  </div>
                </div>
                <button onClick={() => del(b.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
