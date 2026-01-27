'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Search, Settings, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const index = params.index as string || 'logs-events';

  const navItems = [
    {
      label: 'Search',
      href: `/${index}`,
      icon: Search,
      active: pathname === `/${index}` || pathname === '/',
    },
    {
      label: 'Index Settings',
      href: `/settings/index/${index}`,
      icon: Database,
      active: pathname.startsWith('/settings/index'),
    },
    {
      label: 'App Settings',
      href: '/settings/app',
      icon: Settings,
      active: pathname === '/settings/app',
    },
  ];

  return (
    <div className="flex flex-col w-16 border-r bg-card h-screen items-center py-4 shrink-0">
      <nav className="flex flex-col gap-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-md transition-colors",
              item.active 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="sr-only">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
