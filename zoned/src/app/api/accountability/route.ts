import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import twilio from 'twilio';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI();

type TriggerReason = '10x_gaze_away' | '15min_idle' | 'manual';

function getTwilioEnvError(): string | null {
  const missing: string[] = [];
  if (!process.env.TWILIO_ACCOUNT_SID?.trim()) {
    missing.push('TWILIO_ACCOUNT_SID');
  }
  if (!process.env.TWILIO_AUTH_TOKEN?.trim()) {
    missing.push('TWILIO_AUTH_TOKEN');
  }
  if (!process.env.TWILIO_WHATSAPP_FROM?.trim()) {
    missing.push('TWILIO_WHATSAPP_FROM');
  }
  if (missing.length) {
    return `Missing Twilio environment variables: ${missing.join(', ')}`;
  }
  return null;
}

function createTwilioClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export async function POST(request: NextRequest) {
  const twilioEnvError = getTwilioEnvError();
  if (twilioEnvError) {
    return NextResponse.json(
      {
        error: 'Twilio configuration incomplete',
        detail: twilioEnvError,
      },
      { status: 500 }
    );
  }

  const twilioClient = createTwilioClient();
  if (!twilioClient) {
    return NextResponse.json(
      {
        error: 'Twilio configuration incomplete',
        detail: 'Twilio client could not be initialized (credentials missing or invalid).',
      },
      { status: 500 }
    );
  }

  let failureStage: 'database' | 'openai' | 'twilio' | 'unknown' = 'unknown';

  try {
    const { session_id, user_id, trigger_reason } = await request.json();

    const supabase = await createClient();

    failureStage = 'database';

    const [profileResult, sessionResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user_id).single(),
      supabase.from('sessions').select('*').eq('id', session_id).single(),
    ]);

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    if (sessionResult.error || !sessionResult.data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const profile = profileResult.data;
    const session = sessionResult.data;

    if (!profile.accountability_partner_phone) {
      return NextResponse.json(
        { error: 'No accountability partner phone configured' },
        { status: 400 }
      );
    }

    const durationMin = session.duration_seconds
      ? Math.round(session.duration_seconds / 60)
      : 0;
    const distractionMin = session.distraction_seconds
      ? Math.round(session.distraction_seconds / 60)
      : 0;

    const resolvedReason: TriggerReason =
      trigger_reason === '10x_gaze_away' ||
      trigger_reason === '15min_idle' ||
      trigger_reason === 'manual'
        ? trigger_reason
        : 'manual';

    const isManual = resolvedReason === 'manual';

    const systemPrompt = isManual
      ? `You write accountability messages from a focus app called Zoned. ${profile.name} manually requested that ${profile.accountability_partner_name ?? 'their accountability partner'} receive a check-in or accountability nudge — not because of distraction alerts, but because they proactively want their partner to check in on them or help hold them accountable.

Context: they are (or were) working on: ${session.task_description}

Tone: "${profile.shame_tone}"
- "funny": Warm and playful; like a friend who is glad to pass along that they asked for a check-in.
- "strict": Clear and supportive; emphasize that they chose to ask for accountability.
- "savage": High energy and direct; still about them stepping up by requesting support.

Write 2-3 sentences. Address ${profile.accountability_partner_name ?? 'their partner'} directly. Make it clear ${profile.name} proactively asked Zoned to notify their partner so they would check in — different tone from an automatic distraction alert.`
      : `You write accountability messages from a focus app called Zoned. The message is sent to ${profile.accountability_partner_name ?? 'their partner'} about ${profile.name}'s focus session.

${profile.name} was supposed to be working on: ${session.task_description}
Distraction stats:
- Total distraction time: ${distractionMin} minutes (out of ${durationMin})
- Looked away: ${session.gaze_away_count} times
- Switched tabs: ${session.tab_switch_count} times

Tone: "${profile.shame_tone}"
- "funny": Roast them like a comedian friend. Use humor and light teasing.
- "strict": Professional and firm. Disappointment, not anger.
- "savage": No mercy. Brutal honesty with dramatic flair.

Write 2-3 sentences. Address ${profile.accountability_partner_name ?? 'their partner'} directly. Make it clear this is an automated accountability message from Zoned.`;

    failureStage = 'openai';
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 150,
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: 'Generate the accountability message.',
        },
      ],
    });

    const message =
      completion.choices[0]?.message?.content?.trim() ??
      (isManual
        ? `${profile.name} asked Zoned to send you a check-in — please reach out and help hold them accountable.`
        : `${profile.name} got distracted during their focus session. Help hold them accountable!`);

    failureStage = 'twilio';
    const twilioMessage = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM!,
      to: `whatsapp:${profile.accountability_partner_phone}`,
      body: message,
    });

    failureStage = 'database';
    await supabase.from('accountability_triggers').insert({
      session_id,
      user_id,
      trigger_reason: trigger_reason ?? 'manual',
      message_sent: message,
      recipient_phone: profile.accountability_partner_phone,
      twilio_message_sid: twilioMessage.sid,
    });

    await supabase
      .from('sessions')
      .update({ accountability_triggered: true })
      .eq('id', session_id);

    return NextResponse.json({
      success: true,
      message_sid: twilioMessage.sid,
    });
  } catch (error) {
    console.error('accountability error:', error, { failureStage });

    const errName =
      error && typeof error === 'object' && 'name' in error
        ? String((error as { name?: string }).name)
        : undefined;

    if (failureStage === 'openai') {
      return NextResponse.json(
        {
          error: 'Message generation failed',
          detail:
            'OpenAI could not generate the accountability message. Check API configuration and quotas.',
          code: errName,
        },
        { status: 502 }
      );
    }

    if (failureStage === 'twilio') {
      return NextResponse.json(
        {
          error: 'Twilio send failed',
          detail:
            'The message was generated but could not be sent via WhatsApp. Check Twilio credentials, sender number, and recipient format.',
          code: errName,
        },
        { status: 502 }
      );
    }

    if (failureStage === 'database') {
      return NextResponse.json(
        {
          error: 'Database operation failed',
          detail:
            'Could not save accountability trigger or update the session after sending.',
          code: errName,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to process accountability request',
        detail:
          'An unexpected error occurred while handling the request. See server logs for more information.',
        code: errName,
      },
      { status: 500 }
    );
  }
}
