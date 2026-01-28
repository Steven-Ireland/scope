import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Settings, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const [searchParams] = useSearchParams();
  const index = searchParams.get('index') || 'logs-events';

  const navItems = [
    {
      label: 'Search',
      href: `/search?index=${index}`,
      icon: Search,
      active: pathname === `/search` || pathname === '/',
    },
    {
      label: 'Index Settings',
      href: `/settings/index?index=${index}`,
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
            to={item.href}
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