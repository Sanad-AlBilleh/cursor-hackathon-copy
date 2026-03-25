import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Session, Profile } from '@/types/database';
import { LastSessionCard } from '@/components/dashboard/last-session-card';
import { WeeklyChart, type WeeklyDataPoint } from '@/components/dashboard/weekly-chart';
import { AllTimeStats } from '@/components/dashboard/all-time-stats';
import { BrainSection } from '@/components/dashboard/brain-section';
import { EmptyState } from '@/components/dashboard/empty-state';
import { AppHeader } from '@/components/app-header';
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
        .select(
          'started_at, focus_score, focus_seconds, gaze_away_count, tab_switch_count, static_page_count, afk_count, noise_event_count',
        )
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
      gaze_away_count: number;
      tab_switch_count: number;
      static_page_count: number;
      afk_count: number;
      noise_event_count: number;
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
        <AppHeader />
        <main className="max-w-6xl mx-auto px-4 py-8">
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

  const weeklyDistractionEvents = recentSessions.reduce(
    (sum, s) =>
      sum +
      (s.gaze_away_count ?? 0) +
      (s.tab_switch_count ?? 0) +
      (s.static_page_count ?? 0) +
      (s.afk_count ?? 0) +
      (s.noise_event_count ?? 0),
    0,
  );
  const brainTier = Math.min(4, Math.floor(weeklyDistractionEvents / 5));

  let brainState: BrainState;
  if (brainTier === 0) brainState = 'thriving';
  else if (brainTier === 1) brainState = 'recovering';
  else if (brainTier === 2) brainState = 'stressed';
  else brainState = 'damaged';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your focus overview at a glance
          </p>
        </div>

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

        <BrainSection
          state={brainState}
          weeklyAvg={Math.round(weeklyAvg)}
          weeklyDistractionEvents={weeklyDistractionEvents}
        />
      </main>
    </div>
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
