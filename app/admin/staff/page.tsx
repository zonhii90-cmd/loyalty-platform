'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import AdminShell from '@/components/AdminShell'
import { Plus, Trash2, RefreshCw, UserCircle } from 'lucide-react'

interface StaffMember {
  id: string
  name: string
  role: 'manager' | 'cashier'
  active: boolean
  created_at: string
}

export default function StaffPage() {
  const { authFetch } = useAuth()
  const [staff, setStaff]       = useState<StaffMember[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [name, setName]         = useState('')
  const [pin, setPin]           = useState('')
  const [role, setRole]         = useState<'manager' | 'cashier'>('cashier')
  const [saving, setSaving]     = useState(false)
  const [resetId, setResetId]   = useState<string | null>(null)
  const [resetPin, setResetPin] = useState('')

  async function load() {
    setLoading(true)
    const r = await authFetch('/api/admin/staff')
    const d = await r.json()
    setStaff(d.staff || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addStaff() {
    if (!name.trim() || !/^\d{4}$/.test(pin)) return
    setSaving(true)
    await authFetch('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify({ name, pin, role }),
    })
    setName(''); setPin(''); setRole('cashier'); setShowAdd(false)
    setSaving(false)
    load()
  }

  async function removeStaff(id: string) {
    await authFetch(`/api/admin/staff?id=${id}`, { method: 'DELETE' })
    load()
  }

  async function resetPinFn(id: string) {
    if (!/^\d{4}$/.test(resetPin)) return
    await authFetch('/api/admin/staff', {
      method: 'PATCH',
      body: JSON.stringify({ id, pin: resetPin }),
    })
    setResetId(null); setResetPin(''); load()
  }

  return (
    <AdminShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Staff</h1>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium">
            <Plus size={16} /> Add Staff
          </button>
        </div>

        {showAdd && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-xs font-medium text-gray-500 mb-3">New Staff Member</p>
            <div className="flex flex-col gap-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Name"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4-digit PIN" maxLength={4} type="password" inputMode="numeric"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
              <select value={role} onChange={e => setRole(e.target.value as 'manager' | 'cashier')}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300 bg-white">
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
              </select>
              <button onClick={addStaff} disabled={saving || !name.trim() || pin.length !== 4}
                className="py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'Adding...' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <UserCircle size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No staff added yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {staff.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{s.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setResetId(s.id); setResetPin('') }}
                      className="p-2 rounded-lg hover:bg-gray-50 text-gray-400">
                      <RefreshCw size={15} />
                    </button>
                    <button onClick={() => removeStaff(s.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {resetId === s.id && (
                  <div className="mt-3 flex gap-2">
                    <input value={resetPin} onChange={e => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="New PIN" maxLength={4} type="password" inputMode="numeric"
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300" />
                    <button onClick={() => resetPinFn(s.id)} disabled={resetPin.length !== 4}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-medium disabled:opacity-50">
                      Save
                    </button>
                    <button onClick={() => setResetId(null)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
