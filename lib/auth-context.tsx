'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthCtx {
  token: string
  companyId: string
  companyName: string
  isSuperAdmin: boolean
  isReady: boolean
  login: (companyId: string, token: string, name: string) => void
  logout: () => void
  authFetch: (url: string, init?: RequestInit) => Promise<Response>
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token,       setToken]       = useState('')
  const [companyId,   setCompanyId]   = useState('')
  const [companyName, setCompanyName] = useState('')
  const [isReady,     setIsReady]     = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lp_auth')
      if (saved) {
        const p = JSON.parse(saved)
        setToken(p.token); setCompanyId(p.companyId); setCompanyName(p.companyName || '')
      }
    } catch {}
    setIsReady(true)
  }, [])

  function login(cid: string, tok: string, name: string) {
    setToken(tok); setCompanyId(cid); setCompanyName(name)
    try { localStorage.setItem('lp_auth', JSON.stringify({ token: tok, companyId: cid, companyName: name })) } catch {}
  }

  function logout() {
    setToken(''); setCompanyId(''); setCompanyName('')
    try { localStorage.removeItem('lp_auth') } catch {}
  }

  function authFetch(url: string, init: RequestInit = {}) {
    return fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token':  token,
        'x-company-id':   companyId,
        ...(init.headers || {}),
      },
    })
  }

  return (
    <Ctx.Provider value={{ token, companyId, companyName, isSuperAdmin: companyId === 'super', isReady, login, logout, authFetch }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
