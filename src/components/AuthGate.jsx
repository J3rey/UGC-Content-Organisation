export default function AuthGate({ loading, hasSupabase, session, error, onSignIn, onSignOut, locked, onUnlock, unlockError }) {
  if (loading) {
    return <div className="auth-gate">Loading secure workspace…</div>
  }

  if (locked) {
    return (
      <form
        className="auth-gate auth-form"
        onSubmit={e => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          onUnlock(String(form.get('password') || ''))
        }}
      >
        <input className="input" name="password" type="password" placeholder="Local password" />
        <button className="btn btn-primary" type="submit">Unlock</button>
        {unlockError ? <div className="error">{unlockError}</div> : <div className="hint">Private local-only gate.</div>}
      </form>
    )
  }

  if (hasSupabase && session?.user) {
    return (
      <div className="auth-gate auth-gate-inline">
        <span>Signed in as {session.user.email}</span>
        <button className="btn" onClick={onSignOut}>sign out</button>
      </div>
    )
  }

  return null
}
