'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TEST_USERS = [
  { email: 'rahul@radian.com', name: 'Rahul - Radian Super Admin' },
  { email: 'priya@radian.com', name: 'Priya - Account Manager' },
  { email: 'amit@radian.com', name: 'Amit - Support' },
  { email: 'john@freshthyme.com', name: 'John - FTM Admin' },
  { email: 'sarah@freshthyme.com', name: 'Sarah - FTM Category Manager' },
  { email: 'emily@freshthyme.com', name: 'Emily - FTM Buyer' },
  { email: 'lisa@coke.com', name: 'Lisa - Coke Sales Manager' },
  { email: 'mike@coke.com', name: 'Mike - Coke Sales Rep (FTM scoped)' },
  { email: 'david@coke.com', name: 'David - Coke Sales Rep (Kroger scoped)' },
  { email: 'amy@kehe.com', name: 'Amy - KeHE Admin' },
  { email: 'james@kehe.com', name: 'James - KeHE Coordinator' },
  { email: 'tom@abcbrokers.com', name: 'Tom - ABC Brokers Deal Coordinator' },
  { email: 'bob@consultant.com', name: 'Bob - Multi-company Consultant' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (testEmail: string) => {
    setEmail(testEmail);
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: testEmail,
        password: 'password123',
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials');
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main Login Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Radian Platform</h1>
            <p className="text-gray-600">Multi-tenant Retail Platform</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Password: password123</p>
            </div>

            {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or try a test account</span>
            </div>
          </div>

          {/* Quick Login Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {TEST_USERS.map((user) => (
              <button
                key={user.email}
                onClick={() => handleQuickLogin(user.email)}
                disabled={isLoading}
                className="px-2 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded text-left text-gray-700 hover:text-blue-600 transition-colors disabled:opacity-50 text-xs truncate"
                title={user.name}
              >
                {user.email.split('@')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Test Users Legend */}
        <div className="bg-white bg-opacity-95 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Users</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto text-sm">
            <div className="pb-3 border-b border-gray-200">
              <h4 className="font-semibold text-blue-600 mb-2">🏢 Radian</h4>
              {TEST_USERS.filter((u) => u.email.includes('@radian.com')).map((u) => (
                <div key={u.email} className="text-gray-600">
                  <strong>{u.email}</strong> - {u.name.split(' - ')[1]}
                </div>
              ))}
            </div>

            <div className="py-3 border-b border-gray-200">
              <h4 className="font-semibold text-green-600 mb-2">🛒 FreshThyme</h4>
              {TEST_USERS.filter((u) => u.email.includes('@freshthyme.com')).map((u) => (
                <div key={u.email} className="text-gray-600">
                  <strong>{u.email}</strong> - {u.name.split(' - ')[1]}
                </div>
              ))}
            </div>

            <div className="py-3 border-b border-gray-200">
              <h4 className="font-semibold text-red-600 mb-2">🥤 Coca-Cola</h4>
              {TEST_USERS.filter((u) => u.email.includes('@coke.com')).map((u) => (
                <div key={u.email} className="text-gray-600">
                  <strong>{u.email}</strong> - {u.name.split(' - ')[1]}
                </div>
              ))}
            </div>

            <div className="py-3 border-b border-gray-200">
              <h4 className="font-semibold text-orange-600 mb-2">📦 Other Suppliers</h4>
              {TEST_USERS.filter((u) => u.email.includes('@kehe.com') || u.email.includes('@abcbrokers.com') || u.email.includes('@consultant.com')).map((u) => (
                <div key={u.email} className="text-gray-600">
                  <strong>{u.email}</strong> - {u.name.split(' - ')[1]}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
            💡 <strong>Tip:</strong> All passwords are <code className="bg-gray-100 px-1 rounded">password123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
