'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface WeeklyDataPoint {
  day: string;
  avgScore: number;
  totalFocusMinutes: number;
}

interface WeeklyChartProps {
  data: WeeklyDataPoint[];
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'hsl(0 0% 12%)',
  border: '1px solid hsl(0 0% 20%)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
  padding: '8px 12px',
};

export function WeeklyChart({ data }: WeeklyChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>This Week</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-xs text-muted-foreground mb-3">Focus Score Trend</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="Avg Score"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  dot={{ fill: '#a78bfa', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-3">Focus Minutes / Day</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="totalFocusMinutes"
                  name="Focus Min"
                  fill="#34d399"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
