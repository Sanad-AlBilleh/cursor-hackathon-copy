"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'defaultValue'> {
  value?: number[]
  defaultValue?: number[]
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number[]) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, defaultValue, min = 0, max = 100, step = 1, onValueChange, ...props }, ref) => {
    const currentValue = value?.[0] ?? defaultValue?.[0] ?? min
    const pct = ((currentValue - min) / (max - min)) * 100

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center", className)} data-slot="slider">
        <div className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted">
          <div
            className="absolute h-full bg-primary rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={(e) => {
            const v = Number(e.target.value)
            onValueChange?.([v])
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          {...props}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 block size-3.5 shrink-0 rounded-full border border-ring bg-white shadow-sm transition-[left] pointer-events-none"
          style={{ left: `calc(${pct}% - 7px)` }}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
