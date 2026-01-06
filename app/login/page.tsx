'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Mail, Lock, Loader } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Check if IndexedDB is available
      if (typeof indexedDB === 'undefined') {
        setError('IndexedDB is not available. Please use a modern browser.');
        setIsLoading(false);
        return;
      }

      console.log('[Login] Attempting login with email:', email);
      const session = await loginUser({ email, password });

      console.log('[Login] Login successful, received session:', { userId: session.userId, email: session.email });

      // Store auth tokens in localStorage
      localStorage.setItem('token', session.token);
      localStorage.setItem('refreshToken', session.refreshToken);
      localStorage.setItem('userId', session.userId);
      localStorage.setItem('userEmail', session.email);

      console.log('[Login] Tokens stored in localStorage');
      console.log('[Login] Verifying localStorage:', {
        token: !!localStorage.getItem('token'),
        userId: localStorage.getItem('userId'),
        userEmail: localStorage.getItem('userEmail'),
      });

      // Also store in cookies for middleware access
      console.log('[Login] Setting cookies for server-side middleware...');
      document.cookie = `token=${session.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      document.cookie = `refreshToken=${session.refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}`;
      document.cookie = `userId=${session.userId}; path=/; max-age=${7 * 24 * 60 * 60}`;
      document.cookie = `userEmail=${session.email}; path=/; max-age=${7 * 24 * 60 * 60}`;

      console.log('[Login] Redirecting to connect-wallet...');

      // Small delay to ensure cookies and localStorage are written before redirect
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('[Login] Executing router.push redirect...');
      // Use router.push instead of window.location.href to avoid full page reload
      router.push('/connect-wallet');
    } catch (err) {
      console.error('[Login] Error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AI Bank
          </h1>
          <p className="text-gray-600 mt-2">Welcome back</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Protected by bank-level security
        </p>
      </div>
    </div>
  );
}
