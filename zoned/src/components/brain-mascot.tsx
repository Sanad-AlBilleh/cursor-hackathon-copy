'use client';

import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export type BrainState =
  | 'neutral'
  | 'cracking'
  | 'stressed'
  | 'damaged'
  | 'recovering'
  | 'thriving';

interface BrainMascotProps {
  state: BrainState;
  className?: string;
  showMessage?: string;
}

const stateStyles: Record<
  BrainState,
  { emoji: string; gradient: string; glow: string; extra: string }
> = {
  neutral: {
    emoji: '🧠',
    gradient: 'from-pink-500/20 via-pink-400/10 to-pink-600/20',
    glow: '0 0 30px rgba(236,72,153,0.3), 0 0 60px rgba(236,72,153,0.1)',
    extra: '',
  },
  cracking: {
    emoji: '🧠',
    gradient: 'from-yellow-500/25 via-orange-400/15 to-yellow-600/25',
    glow: '0 0 30px rgba(234,179,8,0.35), 0 0 60px rgba(234,179,8,0.12)',
    extra: '',
  },
  stressed: {
    emoji: '🧠',
    gradient: 'from-red-500/25 via-red-400/15 to-red-600/25',
    glow: '0 0 35px rgba(239,68,68,0.4), 0 0 70px rgba(239,68,68,0.15)',
    extra: '💦',
  },
  damaged: {
    emoji: '🧠',
    gradient: 'from-gray-500/20 via-gray-400/10 to-gray-600/20',
    glow: '0 0 20px rgba(107,114,128,0.2)',
    extra: '😢',
  },
  recovering: {
    emoji: '🧠',
    gradient: 'from-emerald-500/25 via-green-400/15 to-emerald-600/25',
    glow: '0 0 35px rgba(16,185,129,0.4), 0 0 70px rgba(16,185,129,0.15)',
    extra: '✨',
  },
  thriving: {
    emoji: '🧠',
    gradient: 'from-amber-400/30 via-yellow-300/20 to-amber-500/30',
    glow: '0 0 45px rgba(245,158,11,0.5), 0 0 90px rgba(245,158,11,0.2)',
    extra: '🌟',
  },
};

const brainVariants: Variants = {
  neutral: {
    scale: 1,
    rotate: 0,
    y: [0, -6, 0],
    filter: 'grayscale(0) brightness(1)',
    transition: {
      y: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
      filter: { duration: 0.5 },
    },
  },
  cracking: {
    scale: 1,
    rotate: [-1.5, 1.5, -1.5],
    y: 0,
    filter: 'grayscale(0) brightness(1.1) sepia(0.3)',
    transition: {
      rotate: { repeat: Infinity, duration: 0.4, ease: 'easeInOut' },
      filter: { duration: 0.5 },
    },
  },
  stressed: {
    scale: 1.05,
    rotate: [-3, 3, -3],
    y: 0,
    filter: 'grayscale(0) brightness(1)',
    transition: {
      rotate: { repeat: Infinity, duration: 0.15, ease: 'easeInOut' },
      scale: { duration: 0.3 },
    },
  },
  damaged: {
    scale: 0.85,
    rotate: -3,
    y: 4,
    filter: 'grayscale(0.7) brightness(0.7)',
    transition: { duration: 0.6, ease: 'easeOut' },
  },
  recovering: {
    scale: [1, 1.06, 1],
    rotate: 0,
    y: [0, -5, 0],
    filter: 'grayscale(0) brightness(1.15)',
    transition: {
      scale: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' },
      y: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' },
      filter: { duration: 0.5 },
    },
  },
  thriving: {
    scale: [1, 1.12, 1],
    rotate: [0, 4, -4, 0],
    y: [0, -10, 0],
    filter: 'grayscale(0) brightness(1.2)',
    transition: {
      scale: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
      rotate: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
      y: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
      filter: { duration: 0.5 },
    },
  },
};

export function BrainMascot({ state, className, showMessage }: BrainMascotProps) {
  const style = stateStyles[state];

  return (
    <motion.div
      className={cn('relative inline-flex flex-col items-center gap-3', className)}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
    >
      <motion.div
        className={cn(
          'relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br',
          style.gradient,
        )}
        style={{ boxShadow: style.glow }}
        variants={brainVariants}
        animate={state}
      >
        <span className="text-5xl select-none" role="img" aria-label={`Brain ${state}`}>
          {style.emoji}
        </span>

        {state === 'cracking' && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 96 96"
            fill="none"
          >
            <path
              d="M40 20 L44 38 L36 50 L42 65 L38 80"
              stroke="rgba(234,179,8,0.6)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M56 18 L52 35 L58 48 L54 62"
              stroke="rgba(234,179,8,0.4)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}

        {style.extra && (
          <motion.span
            className="absolute -top-1 -right-1 text-lg"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            {style.extra}
          </motion.span>
        )}
      </motion.div>

      {showMessage && (
        <motion.div
          className="relative px-4 py-2 bg-card rounded-xl text-sm text-card-foreground ring-1 ring-foreground/10 max-w-[220px] text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card rotate-45 border-l border-t border-foreground/10" />
          <p className="relative z-10">{showMessage}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
