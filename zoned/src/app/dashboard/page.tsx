import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Session, Profile } from '@/types/database';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { LastSessionCard } from '@/components/dashboard/last-session-card';
import { WeeklyChart, type WeeklyDataPoint } from '@/components/dashboard/weekly-chart';
import { AllTimeStats } from '@/components/dashboard/all-time-stats';
import { BrainSection } from '@/components/dashboard/brain-section';
import { EmptyState } from '@/components/dashboard/empty-state';
import type { BrainState } from '@/components/brain-mascot';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const [latestResult, recentResult, allResult, profileResult] =
    await Promise.all([
      supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('sessions')
        .select('started_at, focus_score, focus_seconds')
        .eq('user_id', user.id)
        .gte(
          'started_at',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('started_at', { ascending: true }),
      supabase
        .from('sessions')
        .select('focus_seconds, focus_score')
        .eq('user_id', user.id),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ]);

  const latestSession = latestResult.data as Session | null;
  const recentSessions =
    (recentResult.data as {
      started_at: string;
      focus_score: number | null;
      focus_seconds: number | null;
    }[]) ?? [];
  const allSessions =
    (allResult.data as {
      focus_seconds: number | null;
      focus_score: number | null;
    }[]) ?? [];
  const profile = profileResult.data as Profile | null;

  if (!latestSession || allSessions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <EmptyState />
        </main>
      </div>
    );
  }

  const weeklyData = buildWeeklyData(recentSessions);

  const lifetimeFocusSeconds = allSessions.reduce(
    (sum, s) => sum + (s.focus_seconds ?? 0),
    0,
  );
  const totalSessions = allSessions.length;
  const scores = allSessions.map((s) => s.focus_score ?? 0);
  const bestScore = Math.max(...scores);
  const avgScore =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

  const weeklyScores = recentSessions
    .map((s) => s.focus_score)
    .filter((v): v is number => v != null);
  const weeklyAvg =
    weeklyScores.length > 0
      ? weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length
      : 0;

  let brainState: BrainState;
  if (weeklyAvg >= 80) brainState = 'thriving';
  else if (weeklyAvg >= 60) brainState = 'recovering';
  else if (weeklyAvg >= 40) brainState = 'stressed';
  else brainState = 'damaged';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <LastSessionCard session={latestSession} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklyChart data={weeklyData} />
          <AllTimeStats
            lifetimeFocusSeconds={lifetimeFocusSeconds}
            totalSessions={totalSessions}
            bestScore={bestScore}
            avgScore={avgScore}
            currentStreak={profile?.current_streak_days ?? 0}
            longestStreak={profile?.longest_streak_days ?? 0}
          />
        </div>

        <BrainSection state={brainState} weeklyAvg={Math.round(weeklyAvg)} />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-semibold hover:opacity-80 transition-opacity">
          Zoned Dashboard
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/session"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Session
          </Link>
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Settings
          </Link>
          <Link
            href="/session"
            className={cn(buttonVariants({ size: 'sm' }))}
          >
            Start New Session
          </Link>
        </nav>
      </div>
    </header>
  );
}

function buildWeeklyData(
  sessions: {
    started_at: string;
    focus_score: number | null;
    focus_seconds: number | null;
  }[],
): WeeklyDataPoint[] {
  const dayMap = new Map<string, { scores: number[]; focusSec: number }>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap.set(d.toISOString().split('T')[0], { scores: [], focusSec: 0 });
  }

  for (const s of sessions) {
    const day = s.started_at.split('T')[0];
    const bucket = dayMap.get(day);
    if (!bucket) continue;
    if (s.focus_score != null) bucket.scores.push(s.focus_score);
    bucket.focusSec += s.focus_seconds ?? 0;
  }

  return Array.from(dayMap.entries()).map(([day, { scores, focusSec }]) => ({
    day: new Date(day + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
    }),
    avgScore:
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
    totalFocusMinutes: Math.round(focusSec / 60),
  }));
}
