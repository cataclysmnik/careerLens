'use client';

import React, { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/placement/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: 'all', title, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setResult(`Sent to ${data.sentTo} student(s).`);
      setTitle('');
      setBody('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <main className="mx-auto max-w-2xl p-6 mt-6 pb-24 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Notify Students</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Send an in-app announcement to every student (e.g. a reminder to upload their resume).
          </p>
        </div>

        <form onSubmit={handleSend} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Upload your resume this week"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Message</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-32 p-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Add details for students here..."
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {result && <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {result}</p>}

          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send to all students
          </button>
        </form>
      </main>
    </div>
  );
}
