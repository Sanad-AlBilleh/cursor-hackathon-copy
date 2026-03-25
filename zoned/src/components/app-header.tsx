'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import { ThemeToggle } from '@/components/theme-toggle';
import { Brain, Plus } from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/session', label: 'Session' },
  { href: '/settings', label: 'Settings' },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 via-emerald-600 to-cyan-600 shadow-md shadow-teal-500/20 ring-1 ring-white/10">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading text-xl font-semibold tracking-tight">
              Zoned
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/session"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'gap-1.5 rounded-lg',
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            New Session
          </Link>
        </div>
      </div>
    </header>
  );
}
