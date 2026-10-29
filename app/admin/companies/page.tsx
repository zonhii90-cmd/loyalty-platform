'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import AdminShell from '@/components/AdminShell'

interface Company { id: string; name: string; email: string|null; created_at: string }

export default function CompaniesPage() {
  const { authFetch, isSuperAdmin } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading,   setLoading]   = useState(true)
  const [adding,    setAdding]    = useState(false)
  const [form, setForm] = useState({ id: '', name: '', password: '', email: '' })
  const [err, setErr] = useState('')

  function load() {
    setLoading(true)
    authFetch('/api/admin/companies').then(r => r.json())
      .then(d => setCompanies(d.companies || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (isSuperAdmin) load() }, [isSuperAdmin])

  async function add() {
    if (!form.id.trim() || !form.name.trim() || !form.password.trim()) {
      setErr('ID, name, and password are required'); return
    }
    setAdding(true); setErr('')
    const res = await authFetch('/api/admin/companies', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (d.error) { setErr(d.error) }
    else { setForm({ id: '', name: '', password: '', email: '' }); load() }
    setAdding(false)
  }

  async function remove(id: string) {
    if (!confirm(`Delete company "${id}"? This cannot be undone.`)) return
    await authFetch('/api/admin/companies?id=' + id, { method: 'DELETE' })
    load()
  }

  if (!isSuperAdmin) return (
    <AdminShell>
      <div className="text-center py-16 text-gray-400">Super admin only</div>
    </AdminShell>
  )

  return (
    <AdminShell>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Companies</h1>

        {/* Add form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Add Company</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
              placeholder="ID (slug)" className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Name" className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
            <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Password" className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email (optional)" className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
          </div>
          {err && <p className="text-xs text-red-500 mb-2">{err}</p>}
          <button onClick={add} disabled={adding}
            className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-40">
            {adding ? '...' : 'Add Company'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {companies.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.id}{c.email ? ' · ' + c.email : ''}</p>
                </div>
                <button onClick={() => remove(c.id)}
                  className="px-3 py-1.5 rounded-xl border border-red-100 text-red-400 text-xs shrink-0">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
