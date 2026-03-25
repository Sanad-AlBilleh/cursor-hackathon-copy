import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Clock, Flame, Trophy, BarChart3, ClipboardList, Star } from 'lucide-react';

interface AllTimeStatsProps {
  lifetimeFocusSeconds: number;
  totalSessions: number;
  bestScore: number;
  avgScore: number;
  currentStreak: number;
  longestStreak: number;
}

export function AllTimeStats({
  lifetimeFocusSeconds,
  totalSessions,
  bestScore,
  avgScore,
  currentStreak,
  longestStreak,
}: AllTimeStatsProps) {
  const items = [
    {
      label: 'Total Focus',
      value: `${(lifetimeFocusSeconds / 3600).toFixed(1)}h`,
      icon: Clock,
      accent: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-100 dark:bg-teal-500/15',
    },
    {
      label: 'Current Streak',
      value: `${currentStreak}d`,
      icon: Flame,
      accent: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-500/15',
    },
    {
      label: 'Best Streak',
      value: `${longestStreak}d`,
      icon: Trophy,
      accent: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    },
    {
      label: 'Avg Score',
      value: String(Math.round(avgScore)),
      icon: BarChart3,
      accent: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-100 dark:bg-indigo-500/15',
    },
    {
      label: 'Sessions',
      value: String(totalSessions),
      icon: ClipboardList,
      accent: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-100 dark:bg-sky-500/15',
    },
    {
      label: 'Best Score',
      value: String(bestScore),
      icon: Star,
      accent: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-100 dark:bg-rose-500/15',
    },
  ];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>All-Time Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-2 bg-muted/40 rounded-xl p-4"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.accent}`} />
              </div>
              <span className="text-2xl font-bold tabular-nums">{stat.value}</span>
              <span className="text-[11px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
