import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Session } from '@/types/database';
import { AnalyticsClient } from './analytics-client';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: rows } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false });

  const sessions = (rows ?? []) as Session[];

  const weeklyTrend = buildWeeklyTrend(sessions);

  return <AnalyticsClient sessions={sessions} weeklyTrend={weeklyTrend} />;
}

function buildWeeklyTrend(
  sessions: Session[],
): { day: string; avgScore: number; focusMinutes: number }[] {
  const dayMap = new Map<string, { scores: number[]; focusSec: number }>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap.set(d.toISOString().split('T')[0], { scores: [], focusSec: 0 });
  }

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const s of sessions) {
    const t = new Date(s.started_at).getTime();
    if (t < cutoff) continue;
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
    focusMinutes: Math.round(focusSec / 60),
  }));
}
