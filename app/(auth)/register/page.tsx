'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { GraduationCap, Building2, ShieldCheck } from 'lucide-react';
import { SKIP_APPROVAL } from '@/lib/demo';
import { SIGNUP_ROLE_COOKIE } from '@/lib/signupRole';

type RoleOption = 'STUDENT' | 'PLACEMENT_CELL' | 'COMPANY';

const ROLE_OPTIONS: { value: RoleOption; label: string; icon: typeof GraduationCap }[] = [
  { value: 'STUDENT', label: 'Student', icon: GraduationCap },
  { value: 'PLACEMENT_CELL', label: 'Placement Cell', icon: ShieldCheck },
  { value: 'COMPANY', label: 'Company', icon: Building2 },
];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RoleOption>('STUDENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const nameLabel = role === 'COMPANY' ? 'Company Name' : 'Full Name';

  // Only applies if this Google account is new; existing accounts keep their role.
  const handleGoogle = () => {
    document.cookie = `${SIGNUP_ROLE_COOKIE}=${role}; path=/; max-age=600; samesite=lax`;
    signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else if (data.status === 'PENDING') {
        router.push('/pending-approval');
      } else {
        router.push('/login');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-lg dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create an account
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {ROLE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = role === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-zinc-700 dark:text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {role !== 'STUDENT' && !SKIP_APPROVAL && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-lg p-3">
            {role === 'COMPANY' ? 'Company' : 'Placement Cell'} accounts require approval from an
            existing Placement Cell member before you can sign in.
          </p>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="relative block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700"
                placeholder={nameLabel}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="relative block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-zinc-800 dark:text-white dark:ring-zinc-700"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-zinc-900 px-2 text-gray-400">or</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-zinc-700 px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            Continue with Google as {ROLE_OPTIONS.find((o) => o.value === role)?.label}
          </button>

          <div className="text-center text-sm">
            <span className="text-gray-500">Already have an account? </span>
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
