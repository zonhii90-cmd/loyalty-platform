import { Suspense } from 'react'
import MemberLookupClient from './MemberLookupClient'

export default function MemberLookupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <MemberLookupClient />
    </Suspense>
  )
}
