import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-7xl mb-6 animate-bounce">🧠</div>
      <h2 className="text-2xl font-bold mb-2">Your brain is ready</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        No sessions yet. Start your first focus session and see how your brain
        responds to deep work!
      </p>
      <Button size="lg" render={<Link href="/session" />}>
        Start Your First Session
      </Button>
    </div>
  );
}
