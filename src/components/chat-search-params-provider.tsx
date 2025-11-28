'use client'

import { Suspense } from 'react'

export default function ChatSearchParamsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-32">加载中...</div>}>
      {children}
    </Suspense>
  )
}