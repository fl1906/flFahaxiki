import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export function getToken(): string | null {
  const cookieStore = cookies()
  const token = cookieStore.get('token')?.value
  return token || null
}