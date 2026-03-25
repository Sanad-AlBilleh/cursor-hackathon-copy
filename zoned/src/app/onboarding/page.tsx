'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { ShameTone, CoachPersona, NoiseSensitivity } from '@/types/database';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

function sliderVal(v: number | readonly number[]): number {
  return typeof v === 'number' ? v : v[0];
}

const PERSONAS: {
  id: CoachPersona;
  emoji: string;
  name: string;
  desc: string;
}[] = [
  { id: 'drill_sergeant', emoji: '🎖️', name: 'The Drill Sergeant', desc: 'Tough love, zero excuses' },
  { id: 'hype_coach', emoji: '🔥', name: 'The Hype Coach', desc: 'Always positive, you got this' },
  { id: 'therapist', emoji: '🧘', name: 'The Therapist', desc: 'Calm, understanding, gentle nudges' },
  { id: 'friend', emoji: '😎', name: 'The Friend', desc: 'Casual, funny, uses slang' },
];

const NOISE_MAP: NoiseSensitivity[] = ['low', 'medium', 'high'];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 240 : -240, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -240 : 240, opacity: 0 }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [shameTone, setShameTone] = useState<ShameTone>('funny');

  const [coachPersona, setCoachPersona] = useState<CoachPersona>('hype_coach');

  const [usesPhone, setUsesPhone] = useState(false);
  const [phoneGrace, setPhoneGrace] = useState(3);
  const [noiseSensitivity, setNoiseSensitivity] = useState<NoiseSensitivity>('medium');
  const [gazeThreshold, setGazeThreshold] = useState(20);

  const [taskDescription, setTaskDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return taskDescription.trim().length >= 10;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You need to be signed in to continue');
        return;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        name,
        accountability_partner_name: partnerName || null,
        accountability_partner_phone: partnerPhone || null,
        shame_tone: shameTone,
        coach_persona: coachPersona,
        uses_phone_for_work: usesPhone,
        phone_grace_period_seconds: phoneGrace * 60,
        gaze_threshold_seconds: gazeThreshold,
        noise_sensitivity: noiseSensitivity,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      router.push('/session?task=' + encodeURIComponent(taskDescription));
    } catch (err) {
      console.error('Onboarding error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const noiseIndex = NOISE_MAP.indexOf(noiseSensitivity);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/40 via-background to-background" />

      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Progress dots */}
        <div className="flex gap-2.5 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === step
                  ? 'w-8 bg-violet-500'
                  : i < step
                    ? 'w-2 bg-violet-500/50'
                    : 'w-2 bg-muted',
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="w-full max-w-lg min-h-[380px] flex items-start">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full"
            >
              {/* Step 1 — Identity */}
              {step === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Who are you?</CardTitle>
                    <CardDescription>
                      Let&apos;s set up your accountability system
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">First name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your first name"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partner-name">Accountability partner name</Label>
                      <Input
                        id="partner-name"
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        placeholder="Their name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partner-phone">Partner&apos;s WhatsApp number</Label>
                      <Input
                        id="partner-phone"
                        type="tel"
                        value={partnerPhone}
                        onChange={(e) => setPartnerPhone(e.target.value)}
                        placeholder="+962"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Shame message tone</Label>
                      <Select
                        value={shameTone}
                        onValueChange={(val) => setShameTone(val as ShameTone)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="funny">Funny &amp; Playful</SelectItem>
                          <SelectItem value="strict">Strict &amp; Direct</SelectItem>
                          <SelectItem value="savage">Savage &amp; Brutal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2 — Coach Persona */}
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Pick your coach</CardTitle>
                    <CardDescription>
                      Choose the personality that&apos;ll keep you focused
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {PERSONAS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setCoachPersona(p.id)}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all cursor-pointer',
                            'hover:border-violet-500/50 hover:bg-violet-500/5',
                            coachPersona === p.id
                              ? 'ring-2 ring-violet-500 border-violet-500 bg-violet-500/10'
                              : 'border-border',
                          )}
                        >
                          <span className="text-3xl">{p.emoji}</span>
                          <span className="text-sm font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">{p.desc}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3 — Working Context */}
              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Working context</CardTitle>
                    <CardDescription>
                      Help us understand your environment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={usesPhone}
                          onCheckedChange={(checked) => setUsesPhone(Boolean(checked))}
                        />
                        <Label className="cursor-pointer">
                          I sometimes need to use my phone for work
                        </Label>
                      </div>
                      <AnimatePresence>
                        {usesPhone && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2 pl-7 pt-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm">Phone grace period</Label>
                                <span className="text-sm tabular-nums text-muted-foreground">
                                  {phoneGrace} min
                                </span>
                              </div>
                              <Slider
                                value={[phoneGrace]}
                                onValueChange={(val) => setPhoneGrace(sliderVal(val))}
                                min={1}
                                max={10}
                                step={1}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Noise sensitivity</Label>
                        <span className="text-sm font-medium capitalize text-violet-400">
                          {noiseSensitivity}
                        </span>
                      </div>
                      <Slider
                        value={[noiseIndex]}
                        onValueChange={(val) => setNoiseSensitivity(NOISE_MAP[sliderVal(val)])}
                        min={0}
                        max={2}
                        step={1}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Gaze away threshold</Label>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {gazeThreshold}s
                        </span>
                      </div>
                      <Slider
                        value={[gazeThreshold]}
                        onValueChange={(val) => setGazeThreshold(sliderVal(val))}
                        min={5}
                        max={60}
                        step={1}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>5s</span>
                        <span>60s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 4 — Pre-Session Task */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">What are you working on?</CardTitle>
                    <CardDescription>
                      Describe your task to seed your first focus session
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="e.g. Writing the introduction for my thesis on machine learning…"
                      className="min-h-[140px] resize-none"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      {taskDescription.trim().length < 10
                        ? `${10 - taskDescription.trim().length} more characters needed`
                        : 'Looks good — ready to focus'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-10">
          {step > 0 && (
            <Button variant="outline" onClick={goBack} className="min-w-[100px]">
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              className="min-w-[100px] bg-violet-600 text-white hover:bg-violet-700"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="min-w-[160px] bg-violet-600 text-white hover:bg-violet-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Starting…
                </>
              ) : (
                'Start Focusing'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
