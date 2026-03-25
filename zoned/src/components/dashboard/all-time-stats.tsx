import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
      icon: '⏱️',
    },
    {
      label: 'Current Streak',
      value: `${currentStreak}d`,
      icon: '🔥',
    },
    {
      label: 'Best Streak',
      value: `${longestStreak}d`,
      icon: '🏆',
    },
    {
      label: 'Avg Score',
      value: String(Math.round(avgScore)),
      icon: '📊',
    },
    {
      label: 'Sessions',
      value: String(totalSessions),
      icon: '📋',
    },
    {
      label: 'Best Score',
      value: String(bestScore),
      icon: '⭐',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>All-Time Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {items.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 bg-muted/30 rounded-lg p-3"
            >
              <span className="text-xl">{stat.icon}</span>
              <span className="text-2xl font-bold tabular-nums">{stat.value}</span>
              <span className="text-[11px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
