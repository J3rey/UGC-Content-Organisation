import { useState } from 'react'

// Compact sign-in widget for the header's top-right. The app is usable without
// signing in (localStorage); signing in with the local admin credentials
// switches storage to the shared Supabase cloud row.
export default function AuthGate({ signedIn, signIn, signOut, error: syncError }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (signedIn) {
    return (
      <div className="auth-widget auth-signed-in">
        <span className="auth-email">signed in</span>
        {syncError && <span className="auth-error" title={syncError}>⚠ sync: {syncError}</span>}
        <button className="btn btn-mini" onClick={signOut}>sign out</button>
      </div>
    )
  }

  function submit(e) {
    e.preventDefault()
    try {
      signIn(username.trim(), password)
      setPassword('')
      setError('')
    } catch (err) {
      setError(err?.message || 'Sign in failed')
    }
  }

  return (
    <form className="auth-widget" onSubmit={submit}>
      <input
        className="input auth-input"
        placeholder="username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <input
        className="input auth-input"
        type="password"
        placeholder="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button className="btn btn-mini" type="submit">sign in</button>
      {error && <span className="auth-error" title={error}>{error}</span>}
    </form>
  )
}
