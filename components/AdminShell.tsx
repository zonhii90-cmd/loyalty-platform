'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Star, Users, Settings, Building2,
  LogOut, MoreHorizontal, UserCog, Stamp, Gift, BarChart2,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: React.ReactNode }

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { token, logout, companyName, isSuperAdmin } = useAuth()
  const pathname = usePathname()
  const router   = useRouter()
  const [showMore, setShowMore] = useState(false)

  const mainNav: NavItem[] = [
    { href: '/admin/dashboard',  label: 'Dashboard',  icon: <LayoutDashboard size={18} /> },
    { href: '/admin/members',    label: 'Members',    icon: <Star size={18} /> },
    { href: '/admin/analytics',  label: 'Analytics',  icon: <BarChart2 size={18} /> },
  ]

  const moreNav: NavItem[] = [
    { href: '/admin/rewards',     label: 'Rewards',     icon: <Gift size={18} /> },
    { href: '/admin/staff',       label: 'Staff',       icon: <UserCog size={18} /> },
    { href: '/admin/stamp-card',  label: 'Stamp Card',  icon: <Stamp size={18} /> },
    { href: '/admin/settings',    label: 'Settings',    icon: <Settings size={18} /> },
    ...(isSuperAdmin
      ? [{ href: '/admin/companies', label: 'Companies', icon: <Building2 size={18} /> }]
      : []
    ),
  ]

  const allSideNav: NavItem[] = [
    ...(isSuperAdmin ? [{ href: '/admin/companies', label: 'Companies', icon: <Building2 size={18} /> }] : []),
    { href: '/admin/dashboard',  label: 'Dashboard',  icon: <LayoutDashboard size={18} /> },
    { href: '/admin/members',    label: 'Members',    icon: <Star size={18} /> },
    { href: '/admin/analytics',  label: 'Analytics',  icon: <BarChart2 size={18} /> },
    { href: '/admin/rewards',    label: 'Rewards',    icon: <Gift size={18} /> },
    { href: '/admin/staff',      label: 'Staff',      icon: <UserCog size={18} /> },
    { href: '/admin/stamp-card', label: 'Stamp Card', icon: <Stamp size={18} /> },
    { href: '/admin/settings',   label: 'Settings',   icon: <Settings size={18} /> },
  ]

  useEffect(() => { if (!token) router.replace('/admin/login') }, [token])
  useEffect(() => { setShowMore(false) }, [pathname])

  if (!token) return null

  return (
    <div className="flex min-h-screen bg-[#F5F5F3]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 py-6 px-3 shrink-0">
        <div className="px-3 mb-8">
          <div className="text-xl font-bold text-violet-600 tracking-tight">Loyalty Platform</div>
          <div className="text-xs text-gray-400 mt-0.5">{companyName || 'Admin'}</div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {allSideNav.map(item => (
            <button key={item.href} onClick={() => router.push(item.href)}
              className={'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ' +
                (pathname.startsWith(item.href)
                  ? 'bg-violet-50 text-violet-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800')}>
              <span className="w-5 flex items-center justify-center shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-50 transition-colors">
          <span className="w-5 flex items-center justify-center shrink-0"><LogOut size={18} /></span>
          Logout
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="text-base font-bold text-violet-600">Loyalty Platform</div>
          <button onClick={logout} className="text-gray-400 p-1"><LogOut size={16} /></button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto pb-24">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden bg-white border-t border-gray-100 flex fixed bottom-0 left-0 right-0 z-20">
          {mainNav.map(item => (
            <button key={item.href} onClick={() => { setShowMore(false); router.push(item.href) }}
              className={'flex-1 flex flex-col items-center py-3 gap-1 text-[10px] transition-colors ' +
                (pathname.startsWith(item.href) ? 'text-violet-600' : 'text-gray-400')}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <button onClick={() => setShowMore(!showMore)}
            className={'flex-1 flex flex-col items-center py-3 gap-1 text-[10px] ' + (showMore ? 'text-violet-600' : 'text-gray-400')}>
            <MoreHorizontal size={18} />
            More
          </button>
        </nav>

        {showMore && (
          <>
            <div className="md:hidden fixed inset-0 z-30" onClick={() => setShowMore(false)} />
            <div className="md:hidden fixed bottom-16 right-0 left-0 bg-white border-t border-gray-100 z-40 px-4 py-3">
              {moreNav.map(item => (
                <button key={item.href} onClick={() => { setShowMore(false); router.push(item.href) }}
                  className={'flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm transition-colors ' +
                    (pathname.startsWith(item.href) ? 'bg-violet-50 text-violet-700 font-medium' : 'text-gray-600 hover:bg-gray-50')}>
                  <span className="w-5 flex items-center justify-center">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
