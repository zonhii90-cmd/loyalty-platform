import { StaffProvider } from '@/lib/staff-context'

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <StaffProvider>{children}</StaffProvider>
}
