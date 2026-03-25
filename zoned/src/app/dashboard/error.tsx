'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
          <Link href="/dashboard" className="text-lg font-semibold">
            Zoned Dashboard
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center space-y-4">
          <div className="text-5xl">📊</div>
          <h2 className="text-xl font-bold">Could not load dashboard</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {error.message || 'Something went wrong loading your data.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={reset} variant="outline">
              Retry
            </Button>
            <Link href="/session">
              <Button>Start a session instead</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
