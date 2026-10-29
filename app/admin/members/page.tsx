'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import AdminShell from '@/components/AdminShell'

interface MemberRow {
  id: string; points: number; tier: string; joined_at: string
  member: { id: string; phone: string; name: string | null }
}

const tierColor: Record<string, string> = {
  bronze: 'text-amber-600 bg-amber-50',
  silver: 'text-gray-500 bg-gray-100',
  gold:   'text-yellow-600 bg-yellow-50',
}

export default function MembersPage() {
  const { authFetch } = useAuth()
  const router = useRouter()
  const [rows,    setRows]    = useState<MemberRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [q,       setQ]       = useState('')
  const [inputQ,  setInputQ]  = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (q) params.set('q', q)
    authFetch('/api/admin/members?' + params)
      .then(r => r.json())
      .then(d => { setRows(d.members || []); setTotal(d.total || 0) })
      .finally(() => setLoading(false))
  }, [page, q])

  function search() { setPage(1); setQ(inputQ) }

  return (
    <AdminShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Members</h1>
          <span className="text-sm text-gray-400">{total} total</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex gap-2">
          <input
            value={inputQ}
            onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search phone or name..."
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300"
          />
          <button onClick={search} className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium">
            Search
          </button>
          {q && (
            <button onClick={() => { setInputQ(''); setQ(''); setPage(1) }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
              ✕
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p>No members yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map(row => (
              <button key={row.id} onClick={() => router.push('/admin/members/' + row.id)}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 text-left hover:border-violet-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 font-bold shrink-0">
                  {(row.member.name || row.member.phone).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{row.member.name || '—'}</p>
                  <p className="text-xs text-gray-400">{row.member.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="text-lg font-bold text-violet-600">{row.points} <span className="text-xs font-normal text-gray-400">pts</span></p>
                  <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium ' + (tierColor[row.tier] || 'text-gray-400 bg-gray-100')}>
                    {row.tier}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {total > 20 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 disabled:opacity-40">
              Prev
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">{page} / {Math.ceil(total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
