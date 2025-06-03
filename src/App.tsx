import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import supabase from '../utils/supabase'
import LoginPage from './components/login/login' // Adjust this path to match your file structure
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

  // If session exists, show main app
  return (
    <>
      <div>
        <h1>Spending Tracker</h1>
        <p>Welcome, {session.user.email}!</p>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>
    </>
  )
}

export default App