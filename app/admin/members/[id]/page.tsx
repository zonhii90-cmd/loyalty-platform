import { Suspense } from 'react'
import MemberDetailClient from './MemberDetailClient'

export default function MemberDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <MemberDetailClient />
    </Suspense>
  )
}
