'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    fetch('/api/placement/notifications')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => setNotifications(json.data ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch('/api/placement/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg z-50">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`block w-full text-left p-4 border-b border-gray-100 dark:border-zinc-800 last:border-0 ${
                  n.read ? 'opacity-60' : 'bg-blue-50/50 dark:bg-blue-900/10'
                }`}
              >
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
