'use client';
import { signOut } from 'next-auth/react';
import { Clock3 } from 'lucide-react';

export default function PendingApprovalPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-10 shadow-lg dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Clock3 className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Awaiting approval</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your account is pending review by the placement cell. You&apos;ll be able to sign in
          normally once an existing placement cell member approves it.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full py-2.5 rounded-md border border-gray-300 dark:border-zinc-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
