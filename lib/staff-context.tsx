'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface StaffSession {
  staffId: string
  staffName: string
  staffRole: 'manager' | 'cashier'
  companyId: string
  companyName: string
  companySlug: string
  primaryColor: string
}

interface StaffCtx extends Partial<StaffSession> {
  isLoggedIn: boolean
  login: (session: StaffSession) => void
  logout: () => void
}

const Ctx = createContext<StaffCtx>({ isLoggedIn: false, login: () => {}, logout: () => {} })

export function StaffProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lp_staff')
      if (saved) setSession(JSON.parse(saved))
    } catch {}
  }, [])

  function login(s: StaffSession) {
    setSession(s)
    try { localStorage.setItem('lp_staff', JSON.stringify(s)) } catch {}
  }

  function logout() {
    setSession(null)
    try { localStorage.removeItem('lp_staff') } catch {}
  }

  return (
    <Ctx.Provider value={{ ...session, isLoggedIn: !!session, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useStaff = () => useContext(Ctx)
