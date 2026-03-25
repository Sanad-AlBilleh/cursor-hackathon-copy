'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { Session } from '@/types/database';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface LastSessionCardProps {
  session: Session;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--chart-2)';
  if (score >= 60) return 'var(--chart-3)';
  if (score >= 40) return 'var(--chart-3)';
  return 'var(--chart-4)';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Okay';
  return 'Needs Work';
}

function scoreTextClass(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function LastSessionCard({ session }: LastSessionCardProps) {
  const score = session.focus_score ?? 0;
  const focusMin = Math.round((session.focus_seconds ?? 0) / 60);
  const distractMin = Math.round((session.distraction_seconds ?? 0) / 60);
  const totalMin = Math.max(focusMin + distractMin, 1);
  const color = scoreColor(score);

  const barData = [
    { name: 'Focus', minutes: focusMin },
    { name: 'Distraction', minutes: distractMin },
  ];

  const events = [
    { label: 'Gaze Away', count: session.gaze_away_count, icon: '👀' },
    { label: 'Tab Switches', count: session.tab_switch_count, icon: '🔄' },
    { label: 'Noise Events', count: session.noise_event_count, icon: '🔊' },
    { label: 'AFK Periods', count: session.afk_count, icon: '💤' },
  ];

  const sessionDate = new Date(session.started_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Last Session Report</CardTitle>
        <CardDescription>{sessionDate}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center justify-center gap-2">
            <svg className="w-36 h-36" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--border)"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={color}
                strokeWidth="6"
                strokeDasharray={`${(score / 100) * 264} 264`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
              <text
                x="50"
                y="44"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-3xl font-bold"
                fill="currentColor"
              >
                {score}
              </text>
              <text
                x="50"
                y="63"
                textAnchor="middle"
                className={`text-[9px] font-medium ${scoreTextClass(score)}`}
                fill={color}
              >
                {scoreLabel(score)}
              </text>
            </svg>
            <p className="text-xs text-muted-foreground">Focus Score</p>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Focus vs Distraction
              </p>
              <div className="h-[72px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" barSize={22}>
                    <XAxis type="number" domain={[0, totalMin]} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={78}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>
                      <Cell fill="var(--chart-2)" />
                      <Cell fill="var(--chart-4)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground mt-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  {focusMin}m focus
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400" />
                  {distractMin}m distracted
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Event Breakdown
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {events.map((e) => (
                  <div key={e.label} className="flex items-center gap-2 text-sm">
                    <span className="shrink-0">{e.icon}</span>
                    <span className="text-muted-foreground truncate">{e.label}</span>
                    <span className="font-semibold tabular-nums ml-auto">{e.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Coach Debrief
            </p>
            <div className="bg-muted/40 rounded-xl p-3 text-sm leading-relaxed text-muted-foreground">
              {session.coach_debrief_text || 'No debrief available for this session.'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
