'use client';

import { cn } from '@/lib/utils';

export interface FocusSplitBarProps {
  focusMinutes: number;
  distractionMinutes: number;
  className?: string;
  showLabels?: boolean;
}

export function FocusSplitBar({
  focusMinutes,
  distractionMinutes,
  className,
  showLabels = true,
}: FocusSplitBarProps) {
  const total = Math.max(focusMinutes + distractionMinutes, 1);
  const focusPct = (focusMinutes / total) * 100;
  const distractPct = (distractionMinutes / total) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted ring-1 ring-border/60 shadow-inner">
        <div
          className="h-full bg-gradient-to-b from-emerald-400 to-emerald-600 transition-all duration-700 ease-out"
          style={{ width: `${focusPct}%` }}
        />
        <div
          className="h-full bg-gradient-to-b from-rose-400 to-rose-600 transition-all duration-700 ease-out"
          style={{ width: `${distractPct}%` }}
        />
      </div>
      {showLabels && (
        <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 align-middle mr-1.5" />
            Focus {focusMinutes}m
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500 align-middle mr-1.5" />
            Distracted {distractionMinutes}m
          </span>
        </div>
      )}
    </div>
  );
}
