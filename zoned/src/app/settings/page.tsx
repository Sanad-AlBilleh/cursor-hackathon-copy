'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ShameTone, CoachPersona, NoiseSensitivity } from '@/types/database';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
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

const NOISE_LABELS: Record<NoiseSensitivity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [gazeThreshold, setGazeThreshold] = useState(20);
  const [noiseSensitivity, setNoiseSensitivity] = useState<NoiseSensitivity>('medium');
  const [usesPhone, setUsesPhone] = useState(false);
  const [phoneGrace, setPhoneGrace] = useState(3);
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [shameTone, setShameTone] = useState<ShameTone>('funny');
  const [coachPersona, setCoachPersona] = useState<CoachPersona>('hype_coach');

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setGazeThreshold(profile.gaze_threshold_seconds);
        setNoiseSensitivity(profile.noise_sensitivity);
        setUsesPhone(profile.uses_phone_for_work);
        setPhoneGrace(Math.round(profile.phone_grace_period_seconds / 60));
        setPartnerName(profile.accountability_partner_name ?? '');
        setPartnerPhone(profile.accountability_partner_phone ?? '');
        setShameTone(profile.shame_tone);
        setCoachPersona(profile.coach_persona);
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You need to be signed in');
        return;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        accountability_partner_name: partnerName || null,
        accountability_partner_phone: partnerPhone || null,
        shame_tone: shameTone,
        coach_persona: coachPersona,
        uses_phone_for_work: usesPhone,
        phone_grace_period_seconds: phoneGrace * 60,
        gaze_threshold_seconds: gazeThreshold,
        noise_sensitivity: noiseSensitivity,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('Settings saved');
    } catch (err) {
      console.error('Settings save error:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust your focus session preferences
          </p>
        </div>

        <Separator />

        {/* Focus Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Focus Detection</CardTitle>
            <CardDescription>
              Configure how sensitive Zoned is to distractions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Gaze away threshold</Label>
                <span className="text-sm tabular-nums font-medium text-violet-400">
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
              <p className="text-xs text-muted-foreground">
                How long you can look away before it counts as a distraction
              </p>
            </div>

            <div className="space-y-2">
              <Label>Noise sensitivity</Label>
              <Select
                value={noiseSensitivity}
                onValueChange={(val) => setNoiseSensitivity(val as NoiseSensitivity)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(NOISE_LABELS) as [NoiseSensitivity, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

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
              {usesPhone && (
                <div className="space-y-2 pl-7">
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Accountability */}
        <Card>
          <CardHeader>
            <CardTitle>Accountability</CardTitle>
            <CardDescription>
              Your partner gets notified when you zone out too long
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-partner-name">Partner name</Label>
                <Input
                  id="s-partner-name"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Their name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-partner-phone">WhatsApp number</Label>
                <Input
                  id="s-partner-phone"
                  type="tel"
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  placeholder="+962"
                />
              </div>
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

        {/* Coach Persona */}
        <Card>
          <CardHeader>
            <CardTitle>Coach Persona</CardTitle>
            <CardDescription>
              Pick who talks to you during focus sessions
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

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-violet-600 text-white hover:bg-violet-700"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </Button>

        <div className="h-8" />
      </div>
    </div>
  );
}
