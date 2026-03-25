'use client';

import { useState } from 'react';
import { BrainMascot, type BrainState } from '@/components/brain-mascot';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface BrainSectionProps {
  state: BrainState;
  weeklyAvg: number;
  /** Sum of distraction events this week — mascot tier steps every 5 */
  weeklyDistractionEvents: number;
}

const stateMessages: Record<BrainState, string> = {
  thriving: 'Your brain is thriving! Keep it up!',
  recovering: 'Good progress — your brain is healing!',
  stressed: 'Your brain could use more focus time.',
  damaged: "Let's get back on track together.",
  neutral: 'Ready for a session?',
  cracking: 'Stay focused — you got this!',
};

export function BrainSection({
  state,
  weeklyAvg,
  weeklyDistractionEvents,
}: BrainSectionProps) {
  const [open, setOpen] = useState(false);
  const mod = weeklyDistractionEvents % 5;
  const nextStep = mod === 0 ? 5 : 5 - mod;

  return (
    <div className="flex flex-col items-center py-6">
      <button
        onClick={() => setOpen(true)}
        className="bg-transparent border-none cursor-pointer p-0 outline-none"
        aria-label="Learn about your brain health"
      >
        <BrainMascot state={state} showMessage={stateMessages[state]} />
      </button>
      <p className="text-xs text-muted-foreground mt-3 text-center max-w-sm">
        7-day score avg:{' '}
        <span className="font-semibold tabular-nums">{weeklyAvg}</span>
        {' · '}
        <span className="text-foreground/80">
          {weeklyDistractionEvents} distraction events this week
        </span>
        <br />
        <span className="opacity-80">
          Mascot updates every 5 events (~{nextStep} until next step)
        </span>
        {' · '}Click the brain to learn more
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>The Science Behind Your Brain</DialogTitle>
            <DialogDescription>
              Understanding how focus works — especially with ADHD
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 text-sm leading-relaxed pt-1">
            <section>
              <h4 className="font-medium mb-1">🧪 Dopamine &amp; Focus</h4>
              <p className="text-muted-foreground">
                ADHD brains have lower baseline dopamine levels, making it harder
                to sustain attention on tasks that aren&apos;t immediately rewarding.
                Zoned helps by creating external accountability — a proven strategy
                for bridging the dopamine gap.
              </p>
            </section>

            <section>
              <h4 className="font-medium mb-1">🔄 The Distraction Cycle</h4>
              <p className="text-muted-foreground">
                Each distraction costs more than the time lost — it takes an
                average of 23 minutes to fully regain deep focus. Your brain mascot
                visualizes this cumulative cost, helping you build awareness of
                switching patterns.
              </p>
            </section>

            <section>
              <h4 className="font-medium mb-1">💪 Neuroplasticity</h4>
              <p className="text-muted-foreground">
                The good news: focus is a trainable skill. Studies show that
                consistent practice with external feedback (like Zoned&apos;s
                real-time coaching) can strengthen prefrontal cortex function over
                4–6 weeks.
              </p>
            </section>

            <section>
              <h4 className="font-medium mb-1">🔥 Streak Science</h4>
              <p className="text-muted-foreground">
                Building daily focus streaks activates your brain&apos;s habit
                formation circuits. After roughly 21 days, the neural pathways for
                sustained attention become significantly stronger, making focus
                feel more natural.
              </p>
            </section>

            <section>
              <h4 className="font-medium mb-1">🎯 Why External Accountability Works</h4>
              <p className="text-muted-foreground">
                Research shows that external accountability increases task
                completion by up to 95%. By combining real-time gaze tracking,
                noise detection, and AI coaching, Zoned creates a feedback loop
                that mirrors the structure ADHD brains thrive in.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
