import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { Brain, ArrowRight } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/15">
        <Brain className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Your brain is ready</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        No sessions yet. Start your first focus session and see how your brain
        responds to deep work!
      </p>
      <Link
        href="/session"
        className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
      >
        Start Your First Session
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
