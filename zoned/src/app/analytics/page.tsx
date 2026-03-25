'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Zap,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Eye,
  MonitorSmartphone,
  Volume2,
  Coffee,
  Calendar,
  Award,
} from 'lucide-react';

const MOCK_SESSIONS = [
  {
    id: '1',
    started_at: '2026-03-25T09:15:00Z',
    task_description: 'Writing research paper introduction',
    focus_score: 85,
    focus_seconds: 2400,
    distraction_seconds: 300,
    gaze_away_count: 2,
    tab_switch_count: 1,
    noise_event_count: 0,
    afk_count: 0,
    coach_debrief_text:
      'Excellent session! Strong focus maintained throughout with minimal distractions. Your gaze stayed locked in and tab discipline was solid.',
  },
  {
    id: '2',
    started_at: '2026-03-25T14:30:00Z',
    task_description: 'Code review for authentication feature',
    focus_score: 72,
    focus_seconds: 1500,
    distraction_seconds: 300,
    gaze_away_count: 4,
    tab_switch_count: 3,
    noise_event_count: 1,
    afk_count: 0,
    coach_debrief_text:
      'Good effort but tab switching impacted your flow. Consider closing Slack and email before deep work sessions.',
  },
  {
    id: '3',
    started_at: '2026-03-24T10:00:00Z',
    task_description: 'Studying algorithms for final exam',
    focus_score: 91,
    focus_seconds: 3300,
    distraction_seconds: 300,
    gaze_away_count: 1,
    tab_switch_count: 0,
    noise_event_count: 0,
    afk_count: 0,
    coach_debrief_text:
      'Outstanding! Nearly perfect focus for a full hour. This is your best session type — deep study with zero tab switches.',
  },
  {
    id: '4',
    started_at: '2026-03-23T16:00:00Z',
    task_description: 'Thesis chapter 3 draft',
    focus_score: 67,
    focus_seconds: 1800,
    distraction_seconds: 600,
    gaze_away_count: 5,
    tab_switch_count: 4,
    noise_event_count: 2,
    afk_count: 1,
    coach_debrief_text:
      'Afternoon slump hit hard. Multiple distractions pulled you away. Try scheduling writing sessions for the morning when your focus peaks.',
  },
  {
    id: '5',
    started_at: '2026-03-22T09:30:00Z',
    task_description: 'JavaScript project debugging',
    focus_score: 78,
    focus_seconds: 1800,
    distraction_seconds: 300,
    gaze_away_count: 3,
    tab_switch_count: 2,
    noise_event_count: 0,
    afk_count: 0,
    coach_debrief_text:
      'Solid debugging session. Tab switches were relevant (Stack Overflow) so not too concerning. Good recovery time.',
  },
  {
    id: '6',
    started_at: '2026-03-21T11:00:00Z',
    task_description: 'Exam preparation — biology',
    focus_score: 55,
    focus_seconds: 1500,
    distraction_seconds: 1500,
    gaze_away_count: 8,
    tab_switch_count: 6,
    noise_event_count: 3,
    afk_count: 2,
    coach_debrief_text:
      'Tough session. High distraction rate suggests this subject needs a different approach — try active recall flashcards instead of passive reading.',
  },
  {
    id: '7',
    started_at: '2026-03-20T14:00:00Z',
    task_description: 'Presentation slides design',
    focus_score: 88,
    focus_seconds: 1350,
    distraction_seconds: 150,
    gaze_away_count: 1,
    tab_switch_count: 1,
    noise_event_count: 0,
    afk_count: 0,
    coach_debrief_text:
      'Creative work suits you! Short, focused burst with great results. This session type consistently scores high for you.',
  },
  {
    id: '8',
    started_at: '2026-03-19T10:30:00Z',
    task_description: 'Reading research papers on ML',
    focus_score: 63,
    focus_seconds: 1800,
    distraction_seconds: 900,
    gaze_away_count: 6,
    tab_switch_count: 5,
    noise_event_count: 1,
    afk_count: 1,
    coach_debrief_text:
      'Reading dense material is tough. Consider the Pomodoro technique — 25 minutes on, 5 off — for heavy reading sessions.',
  },
  {
    id: '9',
    started_at: '2026-03-18T09:00:00Z',
    task_description: 'Data analysis project in Python',
    focus_score: 81,
    focus_seconds: 2700,
    distraction_seconds: 600,
    gaze_away_count: 3,
    tab_switch_count: 2,
    noise_event_count: 0,
    afk_count: 0,
    coach_debrief_text:
      'Strong session! Coding tasks consistently keep you engaged. The 45-minute mark is your sweet spot.',
  },
  {
    id: '10',
    started_at: '2026-03-17T15:00:00Z',
    task_description: 'Creative writing exercise',
    focus_score: 94,
    focus_seconds: 1740,
    distraction_seconds: 60,
    gaze_away_count: 0,
    tab_switch_count: 0,
    noise_event_count: 0,
    afk_count: 0,
    coach_debrief_text:
      'Perfect flow state! Zero distractions for 29 minutes. This is what peak focus looks like. Well done!',
  },
  {
    id: '11',
    started_at: '2026-03-16T13:00:00Z',
    task_description: 'Math problem sets — calculus',
    focus_score: 59,
    focus_seconds: 1200,
    distraction_seconds: 1200,
    gaze_away_count: 7,
    tab_switch_count: 4,
    noise_event_count: 2,
    afk_count: 1,
    coach_debrief_text:
      'Struggled with focus today. Noise was a factor — consider noise-canceling headphones or a quieter workspace.',
  },
  {
    id: '12',
    started_at: '2026-03-15T10:00:00Z',
    task_description: 'Team project planning and documentation',
    focus_score: 76,
    focus_seconds: 960,
    distraction_seconds: 240,
    gaze_away_count: 2,
    tab_switch_count: 3,
    noise_event_count: 0,
    afk_count: 0,
    coach_debrief_text:
      'Decent planning session. Tab switches were collaborative (checking team docs) so context was maintained well.',
  },
];

const MOCK_WEEKLY_TREND = [
  { day: 'Mar 15', avgScore: 76, focusMinutes: 16 },
  { day: 'Mar 16', avgScore: 59, focusMinutes: 20 },
  { day: 'Mar 17', avgScore: 94, focusMinutes: 29 },
  { day: 'Mar 18', avgScore: 81, focusMinutes: 45 },
  { day: 'Mar 19', avgScore: 63, focusMinutes: 30 },
  { day: 'Mar 20', avgScore: 88, focusMinutes: 23 },
  { day: 'Mar 21', avgScore: 55, focusMinutes: 25 },
  { day: 'Mar 22', avgScore: 78, focusMinutes: 30 },
  { day: 'Mar 23', avgScore: 67, focusMinutes: 30 },
  { day: 'Mar 24', avgScore: 91, focusMinutes: 55 },
  { day: 'Mar 25', avgScore: 79, focusMinutes: 65 },
];

const FOCUS_SUGGESTIONS = [
  {
    icon: TrendingUp,
    title: 'Your focus peaks in the morning',
    description:
      'Sessions between 9–11 AM average 86 points vs. 64 in the afternoon. Schedule demanding tasks during your peak window for maximum productivity.',
    impact: 'high' as const,
    color: 'teal',
  },
  {
    icon: MonitorSmartphone,
    title: 'Tab switching is your top distraction',
    description:
      'You average 2.8 tab switches per session, costing ~4 minutes of recovery time each. Try closing Slack, email, and social media before starting.',
    impact: 'high' as const,
    color: 'rose',
  },
  {
    icon: Clock,
    title: 'Aim for 45-minute sessions',
    description:
      'Sessions under 30 minutes show 23% lower scores. Your sweet spot is 40–50 minutes — long enough for deep work, short enough to maintain intensity.',
    impact: 'medium' as const,
    color: 'amber',
  },
  {
    icon: Zap,
    title: "You're building momentum",
    description:
      "Your 7-day average is trending up (+12 points this week). Consistency matters more than perfection — keep showing up and you'll lock in the habit.",
    impact: 'medium' as const,
    color: 'emerald',
  },
  {
    icon: Volume2,
    title: 'Noise affects your deep work',
    description:
      'Sessions with noise events score 18 points lower on average. Consider noise-canceling headphones or ambient brown noise to create a sound barrier.',
    impact: 'low' as const,
    color: 'indigo',
  },
];

const impactBadge = {
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  low: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
};

const iconBg: Record<string, string> = {
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
};

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

export default function AnalyticsPage() {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const totalSessions = MOCK_SESSIONS.length;
  const avgScore = Math.round(
    MOCK_SESSIONS.reduce((s, m) => s + m.focus_score, 0) / totalSessions,
  );
  const totalFocusHours = (
    MOCK_SESSIONS.reduce((s, m) => s + m.focus_seconds, 0) / 3600
  ).toFixed(1);
  const bestScore = Math.max(...MOCK_SESSIONS.map((s) => s.focus_score));

  const summaryCards = [
    {
      label: 'Total Sessions',
      value: totalSessions,
      icon: Calendar,
      accent: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-100 dark:bg-teal-500/15',
    },
    {
      label: 'Average Score',
      value: avgScore,
      icon: Target,
      accent: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-500/15',
    },
    {
      label: 'Focus Hours',
      value: totalFocusHours,
      icon: Clock,
      accent: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    },
    {
      label: 'Best Score',
      value: bestScore,
      icon: Award,
      accent: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-100 dark:bg-rose-500/15',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deep dive into your focus patterns and personalized insights
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <Card className="border-border/60 shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bg}`}
                    >
                      <card.icon className={`w-4.5 h-4.5 ${card.accent}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {card.label}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Weekly Trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-primary" />
                Focus Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  Score over time
                </p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_WEEKLY_TREND}>
                      <defs>
                        <linearGradient
                          id="scoreGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="var(--border)"
                        strokeDasharray="3 3"
                        strokeOpacity={0.5}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{
                          fill: 'var(--muted-foreground)',
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{
                          fill: 'var(--muted-foreground)',
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area
                        type="monotone"
                        dataKey="avgScore"
                        name="Focus Score"
                        stroke="var(--chart-1)"
                        strokeWidth={2.5}
                        fill="url(#scoreGradient)"
                        dot={{
                          fill: 'var(--chart-1)',
                          r: 4,
                          strokeWidth: 0,
                        }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  Focus minutes per day
                </p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={MOCK_WEEKLY_TREND}>
                      <CartesianGrid
                        stroke="var(--border)"
                        strokeDasharray="3 3"
                        strokeOpacity={0.5}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{
                          fill: 'var(--muted-foreground)',
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{
                          fill: 'var(--muted-foreground)',
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar
                        dataKey="focusMinutes"
                        name="Focus Min"
                        fill="var(--chart-2)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Focus Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-4.5 h-4.5 text-amber-500" />
                Tailored Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {FOCUS_SUGGESTIONS.map((suggestion, i) => (
                  <motion.div
                    key={suggestion.title}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
                    className="flex gap-4 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg[suggestion.color]}`}
                    >
                      <suggestion.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold">
                          {suggestion.title}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${impactBadge[suggestion.impact]}`}
                        >
                          {suggestion.impact}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Session History */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="w-4.5 h-4.5 text-muted-foreground" />
                Session History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_SESSIONS.map((session) => {
                  const isExpanded = expandedSession === session.id;
                  const focusMin = Math.round(session.focus_seconds / 60);
                  const distractMin = Math.round(
                    session.distraction_seconds / 60,
                  );
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

                  return (
                    <div
                      key={session.id}
                      className="rounded-xl border border-border/60 overflow-hidden transition-colors hover:border-border"
                    >
                      <button
                        onClick={() =>
                          setExpandedSession(isExpanded ? null : session.id)
                        }
                        className="w-full text-left p-4 flex items-center gap-4 cursor-pointer"
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold tabular-nums shrink-0 ${scoreBg(session.focus_score)} ${scoreColor(session.focus_score)}`}
                        >
                          {session.focus_score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {session.task_description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {dateStr} at {timeStr} &middot; {focusMin}m focused
                            &middot; {distractMin}m distracted
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {session.gaze_away_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <MonitorSmartphone className="w-3 h-3" />
                              {session.tab_switch_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <Volume2 className="w-3 h-3" />
                              {session.noise_event_count}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-1 border-t border-border/40">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                <StatMini
                                  label="Gaze Away"
                                  value={session.gaze_away_count}
                                  icon={<Eye className="w-3.5 h-3.5" />}
                                />
                                <StatMini
                                  label="Tab Switches"
                                  value={session.tab_switch_count}
                                  icon={
                                    <MonitorSmartphone className="w-3.5 h-3.5" />
                                  }
                                />
                                <StatMini
                                  label="Noise Events"
                                  value={session.noise_event_count}
                                  icon={<Volume2 className="w-3.5 h-3.5" />}
                                />
                                <StatMini
                                  label="AFK"
                                  value={session.afk_count}
                                  icon={<Coffee className="w-3.5 h-3.5" />}
                                />
                              </div>
                              <div className="bg-muted/40 rounded-lg p-3">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Coach Debrief
                                </p>
                                <p className="text-sm leading-relaxed">
                                  {session.coach_debrief_text}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

function StatMini({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-sm font-bold tabular-nums">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
