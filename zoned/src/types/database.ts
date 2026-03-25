export type ShameTone = 'funny' | 'strict' | 'savage';
export type CoachPersona = 'drill_sergeant' | 'hype_coach' | 'therapist' | 'friend';
export type NoiseSensitivity = 'low' | 'medium' | 'high';
export type SessionStatus = 'active' | 'ended';
export type DistractionEventType = 'gaze_away' | 'tab_switch' | 'static_page' | 'afk' | 'noise';
export type NoiseDetectedType = 'crowd' | 'music' | 'tv' | 'general_noise' | 'conversation';
export type TriggerReason = '10x_gaze_away' | '15min_idle' | 'manual';

export interface Profile {
  id: string;
  name: string;
  accountability_partner_name: string | null;
  accountability_partner_phone: string | null;
  shame_tone: ShameTone;
  coach_persona: CoachPersona;
  uses_phone_for_work: boolean;
  phone_grace_period_seconds: number;
  gaze_threshold_seconds: number;
  noise_sensitivity: NoiseSensitivity;
  onboarding_completed: boolean;
  current_streak_days: number;
  longest_streak_days: number;
  last_session_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  task_description: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  focus_seconds: number | null;
  distraction_seconds: number | null;
  focus_score: number | null;
  gaze_away_count: number;
  tab_switch_count: number;
  static_page_count: number;
  afk_count: number;
  noise_event_count: number;
  accountability_triggered: boolean;
  longest_focus_streak_seconds: number;
  coach_debrief_text: string | null;
  created_at: string;
}

export interface DistractionEvent {
  id: string;
  session_id: string;
  user_id: string;
  event_type: DistractionEventType;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  coach_message: string | null;
  metadata: Record<string, unknown> | null;
}

export interface NoiseEvent {
  id: string;
  session_id: string;
  user_id: string;
  detected_type: NoiseDetectedType;
  average_db: number;
  duration_seconds: number;
  occurred_at: string;
}

export interface AccountabilityTrigger {
  id: string;
  session_id: string;
  user_id: string;
  trigger_reason: TriggerReason;
  message_sent: string;
  recipient_phone: string;
  twilio_message_sid: string | null;
  sent_at: string;
}
