import { useState } from 'react';
import { Button } from './ui/Button';
import { setTokens } from '../hooks/useApi';

export function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      // Store tokens
      setTokens(data.token, data.refreshToken);

      // Pass user info to parent
      onAuthSuccess({
        userId: data.userId,
        username: username.trim(),
        role: data.role || 'player',
        isNewUser: mode === 'signup',
      });
    } catch {
      setError('Connection failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl text-accent tracking-tight font-logo italic">Composed</h1>
          <p className="text-xs text-gray-400 mt-2">Train smarter. Track everything.</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 mb-6">
          {['signup', 'login'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === m ? 'bg-white text-accent shadow-sm' : 'text-gray-500'
              }`}
            >
              {m === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoComplete="username"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </Button>
        </form>

        {mode === 'signup' && (
          <p className="text-[10px] text-gray-300 text-center mt-4">
            Username: letters, numbers, hyphens, underscores. Password: 8+ characters with a letter and a number.
          </p>
        )}
      </div>
    </div>
  );
}
