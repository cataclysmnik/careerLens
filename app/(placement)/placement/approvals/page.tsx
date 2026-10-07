'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Check, X, Building2, ShieldCheck } from 'lucide-react';

type PendingUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'COMPANY' | 'PLACEMENT_CELL';
  createdAt: string;
};

export default function ApprovalsPage() {
  const [pending, setPending] = useState<PendingUser[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = () => {
    fetch('/api/placement/approvals')
      .then((res) => res.json())
      .then((json) => setPending(json.data))
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const act = async (userId: string, action: 'approve' | 'reject') => {
    setActingOn(userId);
    try {
      await fetch('/api/placement/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      setPending((prev) => prev?.filter((p) => p.id !== userId) ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setActingOn(null);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <main className="mx-auto max-w-4xl p-6 mt-6 pb-24 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Pending Approvals</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Company and Placement Cell signups waiting for review.
          </p>
        </div>

        <div className="space-y-3">
          {(pending ?? []).map((p) => {
            const Icon = p.role === 'COMPANY' ? Building2 : ShieldCheck;
            return (
              <div key={p.id} className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{p.name ?? 'Unnamed'}</p>
                  <p className="text-xs text-gray-500">{p.email} &middot; {p.role === 'COMPANY' ? 'Company' : 'Placement Cell'}</p>
                </div>
                <button
                  disabled={actingOn === p.id}
                  onClick={() => act(p.id, 'approve')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-lg hover:bg-green-100 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  disabled={actingOn === p.id}
                  onClick={() => act(p.id, 'reject')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            );
          })}
          {(pending ?? []).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No accounts awaiting approval.</p>
          )}
        </div>
      </main>
    </div>
  );
}
