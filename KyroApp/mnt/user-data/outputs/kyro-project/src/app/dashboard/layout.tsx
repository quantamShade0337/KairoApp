import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Middleware-style check — handled client-side in each page for simplicity
  return <>{children}</>
}
