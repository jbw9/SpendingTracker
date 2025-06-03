import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import supabase from '../utils/supabase'
import LoginPage from './components/login/login'
import MainPage from './components/main/main' // Make sure this imports MainPage, not Main
import './App.css'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // If no session, show login page
  if (!session) {
    return <LoginPage onLogin={handleLogin} />
  }

  // If session exists, show main app - PASS SUPABASE AS PROP
  return <MainPage session={session} supabase={supabase} />
}

export default App