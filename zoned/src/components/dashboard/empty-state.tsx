import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-7xl mb-6 animate-bounce">🧠</div>
      <h2 className="text-2xl font-bold mb-2">Your brain is ready</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        No sessions yet. Start your first focus session and see how your brain
        responds to deep work!
      </p>
      <Link
        href="/session"
        className={cn(buttonVariants({ size: 'lg' }))}
      >
        Start Your First Session
      </Link>
    </div>
  );
}
