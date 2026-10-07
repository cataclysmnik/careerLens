'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { ROLE_BADGE_CLASS, ROLE_LABEL } from '@/lib/roles';
import { UserAvatar } from './UserAvatar';

export function SidebarUserCard({ profileHref }: { profileHref?: string }) {
  const { data: session } = useSession();
  const user = session?.user;

  const identity = user && (
    <div className="flex items-center gap-3 min-w-0">
      <UserAvatar name={user.name} email={user.email} image={user.image} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {user.name || user.email}
        </p>
        {user.name && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
        )}
        <span
          className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${ROLE_BADGE_CLASS[user.role]}`}
        >
          {ROLE_LABEL[user.role]}
        </span>
      </div>
    </div>
  );

  return (
    <div className="p-4 border-t border-gray-200 dark:border-zinc-800 space-y-2">
      {identity &&
        (profileHref ? (
          <Link
            href={profileHref}
            className="block rounded-lg px-2 py-2 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
          >
            {identity}
          </Link>
        ) : (
          <div className="px-2 py-2">{identity}</div>
        ))}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/10 dark:hover:text-red-400 transition-colors"
      >
        <LogOut className="w-5 h-5 text-gray-400" />
        Sign Out
      </button>
    </div>
  );
}
