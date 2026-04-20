import { useState, useEffect, lazy, Suspense } from 'react'
import type { Session } from '@supabase/supabase-js'
import supabase from '../utils/supabase'
import LoginPage from './components/login/login'
import ResetPassword from './components/login/ResetPassword'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { OfflineIndicator } from './components/OfflineIndicator'
import './App.css'

// Lazy load the main page component for better performance
const MainPage = lazy(() => import('./components/main/main'))

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
        setSession(session)
        setLoading(false)
        return
      }
      setIsPasswordRecovery(false)
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = () => {
    // This will be called from LoginPage, but the session state
    // will be automatically updated by the auth state listener
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#FAF8F4' }}>
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#7C9A7E' }} />
      </div>
    )
  }

  // Password recovery flow: user clicked reset link in email
  if (isPasswordRecovery) {
    return (
      <div className="fixed inset-0 flex items-center justify-center w-screen h-screen overflow-hidden" style={{ backgroundColor: '#FAF8F4' }}>
        <div className="w-full max-w-sm px-6 py-8">
          <ResetPassword onComplete={() => setIsPasswordRecovery(false)} />
        </div>
      </div>
    )
  }

  // If no session, show login page
  if (!session) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <OfflineIndicator />
        <PWAInstallPrompt />
        <PWAUpdatePrompt />
      </>
    )
  }

  // If session exists, show main app - PASS SUPABASE AS PROP
  return (
    <>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#FAF8F4' }}>
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#7C9A7E' }} />
        </div>
      }>
        <MainPage session={session} supabase={supabase} />
      </Suspense>
      <OfflineIndicator />
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </>
  )
}

export default App