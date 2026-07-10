'use client';

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or connection error.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center h-full bg-background p-4">
      <div className="w-full max-w-sm bg-surface border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center text-headline-sm font-bold mb-2">
            DF
          </div>
          <h2 className="text-headline-md font-semibold text-on-surface">DocFlow Enterprise</h2>
          <p className="text-body-sm text-on-surface-variant">Sign in to your workspace</p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container text-body-sm p-3 rounded border border-error/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-body-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-body-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary font-medium py-2 rounded hover:bg-primary-fixed-variant transition-colors text-body-sm mt-2 disabled:bg-primary/50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
