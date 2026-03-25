'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Target,
  Eye,
  MonitorSmartphone,
  Volume2,
  Coffee,
  ChevronDown,
  ChevronUp,
  Calendar,
  Award,
  Zap,
} from 'lucide-react';
import type { Session } from '@/types/database';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FocusSplitBar } from '@/components/focus-split-bar';

export interface AnalyticsClientProps {
  sessions: Session[];
  weeklyTrend: { day: string; avgScore: number; focusMinutes: number }[];
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-100 dark:bg-emerald-500/15';
  if (score >= 60) return 'bg-amber-100 dark:bg-amber-500/15';
  return 'bg-rose-100 dark:bg-rose-500/15';
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--foreground)',
  fontSize: '13px',
  padding: '10px 14px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
};

export function AnalyticsClient({ sessions, weeklyTrend }: AnalyticsClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const n = sessions.length;
    if (n === 0) {
      return {
        avgScore: 0,
        totalFocusHours: '0',
        bestScore: 0,
        totalFocusSec: 0,
        totalDistractSec: 0,
        gaze: 0,
        tabs: 0,
        idle: 0,
        noise: 0,
        afk: 0,
      };
    }
    const scores = sessions.map((s) => s.focus_score ?? 0);
    const totalFocusSec = sessions.reduce((a, s) => a + (s.focus_seconds ?? 0), 0);
    const totalDistractSec = sessions.reduce(
      (a, s) => a + (s.distraction_seconds ?? 0),
      0,
    );
    return {
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / n),
      totalFocusHours: (totalFocusSec / 3600).toFixed(1),
      bestScore: Math.max(...scores),
      totalFocusSec,
      totalDistractSec,
      gaze: sessions.reduce((a, s) => a + s.gaze_away_count, 0),
      tabs: sessions.reduce((a, s) => a + s.tab_switch_count, 0),
      idle: sessions.reduce((a, s) => a + s.static_page_count, 0),
      noise: sessions.reduce((a, s) => a + s.noise_event_count, 0),
      afk: sessions.reduce((a, s) => a + s.afk_count, 0),
    };
  }, [sessions]);

  const totalMin = Math.max(
    1,
    Math.round(totals.totalFocusSec / 60) +
      Math.round(totals.totalDistractSec / 60),
  );
  const focusMinAgg = Math.round(totals.totalFocusSec / 60);
  const distractMinAgg = Math.round(totals.totalDistractSec / 60);

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-muted-foreground">
            No sessions yet. Complete a focus run to see analytics.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 space-y-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
            All-time
          </p>
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
            Analytics
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Combined statistics across every session — not just the last one.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: 'Sessions',
              value: sessions.length,
              icon: Calendar,
              accent: 'text-teal-600 dark:text-teal-400',
              bg: 'bg-teal-100 dark:bg-teal-500/15',
            },
            {
              label: 'Avg score',
              value: totals.avgScore,
              icon: Target,
              accent: 'text-amber-600 dark:text-amber-400',
              bg: 'bg-amber-100 dark:bg-amber-500/15',
            },
            {
              label: 'Focus hours',
              value: totals.totalFocusHours,
              icon: Clock,
              accent: 'text-emerald-600 dark:text-emerald-400',
              bg: 'bg-emerald-100 dark:bg-emerald-500/15',
            },
            {
              label: 'Best score',
              value: totals.bestScore,
              icon: Award,
              accent: 'text-rose-600 dark:text-rose-400',
              bg: 'bg-rose-100 dark:bg-rose-500/15',
            },
          ].map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-border/60 shadow-sm overflow-hidden">
                <CardContent className="pt-5 pb-4">
                  <div
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${c.bg}`}
                  >
                    <c.icon className={`h-5 w-5 ${c.accent}`} />
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        <Card className="border-border/60 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Zap className="h-5 w-5 text-primary" />
              Focus vs distraction (all sessions)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FocusSplitBar
              focusMinutes={focusMinAgg}
              distractionMinutes={distractMinAgg}
              className="max-w-xl"
            />
            <p className="text-xs text-muted-foreground">
              Total ~{totalMin} recorded minutes across {sessions.length} sessions (
              {((focusMinAgg / totalMin) * 100).toFixed(0)}% focus).
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <TrendingUp className="h-5 w-5 text-primary" />
              Distraction events (lifetime)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Gaze away', value: totals.gaze, icon: Eye },
                { label: 'Tab switches', value: totals.tabs, icon: MonitorSmartphone },
                { label: 'Idle', value: totals.idle, icon: Coffee },
                { label: 'Noise', value: totals.noise, icon: Volume2 },
                { label: 'AFK', value: totals.afk, icon: Coffee },
              ].map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-center"
                >
                  <row.icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-xl font-bold tabular-nums">{row.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {row.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {weeklyTrend.length > 0 && (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading">Last 7 days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyTrend}>
                    <defs>
                      <linearGradient id="aScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="avgScore"
                      name="Avg score"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      fill="url(#aScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyTrend}>
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar
                      dataKey="focusMinutes"
                      name="Focus min"
                      fill="var(--chart-2)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-heading">Every session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.map((session) => {
              const isOpen = expandedId === session.id;
              const focusMin = Math.round((session.focus_seconds ?? 0) / 60);
              const distractMin = Math.round((session.distraction_seconds ?? 0) / 60);
              const date = new Date(session.started_at);
              const dateStr = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const timeStr = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });
              const sc = session.focus_score ?? 0;

              return (
                <div
                  key={session.id}
                  className="overflow-hidden rounded-xl border border-border/60 transition-colors hover:border-primary/30"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : session.id)}
                    className="flex w-full items-center gap-4 p-4 text-left"
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ${scoreBg(sc)} ${scoreColor(sc)}`}
                    >
                      {sc}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{session.task_description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {dateStr} · {timeStr} · {focusMin}m focus · {distractMin}m distracted
                      </p>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/40"
                      >
                        <div className="space-y-4 p-4 pt-3">
                          <FocusSplitBar
                            focusMinutes={focusMin}
                            distractionMinutes={distractMin}
                          />
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-sm">
                            <MiniStat label="Gaze" v={session.gaze_away_count} />
                            <MiniStat label="Tabs" v={session.tab_switch_count} />
                            <MiniStat label="Noise" v={session.noise_event_count} />
                            <MiniStat label="AFK" v={session.afk_count} />
                          </div>
                          {session.coach_debrief_text && (
                            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground leading-relaxed">
                              {session.coach_debrief_text}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function MiniStat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 px-2 py-2 text-center">
      <p className="text-lg font-bold tabular-nums">{v}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
