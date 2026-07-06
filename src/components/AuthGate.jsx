import { useState } from 'react'

// Compact sign-in widget for the header's top-right. The app is usable without
// signing in (localStorage); signing in switches storage to Supabase.
export default function AuthGate({ loading, session, signIn, signOut }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (loading) return <div className="auth-widget auth-muted">…</div>

  if (session?.user) {
    return (
      <div className="auth-widget auth-signed-in">
        <span className="auth-email" title={session.user.email}>{session.user.email}</span>
        <button className="btn btn-mini" onClick={signOut}>sign out</button>
      </div>
    )
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      setPassword('')
    } catch (err) {
      setError(err?.message || 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-widget" onSubmit={submit}>
      <input
        className="input auth-input"
        type="email"
        placeholder="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        className="input auth-input"
        type="password"
        placeholder="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button className="btn btn-mini" type="submit" disabled={busy}>
        {busy ? '…' : 'sign in'}
      </button>
      {error && <span className="auth-error" title={error}>{error}</span>}
    </form>
  )
}
