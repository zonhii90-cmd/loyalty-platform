'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import AdminShell from '@/components/AdminShell'
import { Upload, X, Loader2, CheckCircle, Download } from 'lucide-react'

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
  const [rows,       setRows]       = useState<MemberRow[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [q,          setQ]          = useState('')
  const [inputQ,     setInputQ]     = useState('')
  const [loading,    setLoading]    = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [importing,  setImporting]  = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [exporting,  setExporting]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function exportCsv() {
    setExporting(true)
    try {
      const r = await authFetch('/api/admin/members/export')
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function importCsv(file: File) {
    setImporting(true); setImportResult(null)
    const text = await file.text()
    const r = await authFetch('/api/admin/members/import', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text,
    })
    const d = await r.json()
    setImportResult(d)
    setImporting(false)
    if (r.ok) { setPage(1); setQ('') }
  }

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
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{total} total</span>
            <button onClick={exportCsv} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50">
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Export CSV
            </button>
            <button onClick={() => { setShowImport(v => !v); setImportResult(null) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50">
              <Upload size={13} /> Import CSV
            </button>
          </div>
        </div>

        {showImport && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500">Bulk Import Members</p>
              <button onClick={() => setShowImport(false)}><X size={14} className="text-gray-300" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-3">CSV format: <code className="bg-gray-50 px-1 rounded">phone, name (optional), points (optional)</code></p>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden"
              onChange={e => { if (e.target.files?.[0]) importCsv(e.target.files[0]) }} />
            <button onClick={() => fileRef.current?.click()} disabled={importing}
              className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-violet-300 hover:text-violet-500 transition-colors flex flex-col items-center gap-2 disabled:opacity-50">
              {importing ? <Loader2 size={22} className="animate-spin text-violet-400" /> : <Upload size={22} />}
              {importing ? 'Importing…' : 'Click to choose CSV file'}
            </button>
            {importResult && (
              <div className={'mt-3 p-3 rounded-xl text-sm ' + (importResult.errors.length ? 'bg-amber-50' : 'bg-emerald-50')}>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <p className="font-medium text-gray-700">{importResult.imported} imported, {importResult.skipped} skipped</p>
                </div>
                {importResult.errors.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">Failed: {importResult.errors.join(', ')}</p>
                )}
              </div>
            )}
          </div>
        )}

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
