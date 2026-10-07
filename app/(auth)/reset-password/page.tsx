import { Suspense } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-black p-6">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-lg dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
        {/* The form reads the token from the URL, so it renders on the client. */}
        <Suspense fallback={<p className="text-center text-sm text-gray-500">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
