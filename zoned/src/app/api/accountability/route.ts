import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import twilio from 'twilio';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    const { session_id, user_id, trigger_reason } = await request.json();

    const supabase = await createClient();

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 150,
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content: `You write accountability messages from a focus app called Zoned. The message is sent to ${profile.accountability_partner_name ?? 'their partner'} about ${profile.name}'s focus session.

${profile.name} was supposed to be working on: ${session.task_description}
Distraction stats:
- Total distraction time: ${distractionMin} minutes (out of ${durationMin})
- Looked away: ${session.gaze_away_count} times
- Switched tabs: ${session.tab_switch_count} times

Tone: "${profile.shame_tone}"
- "funny": Roast them like a comedian friend. Use humor and light teasing.
- "strict": Professional and firm. Disappointment, not anger.
- "savage": No mercy. Brutal honesty with dramatic flair.

Write 2-3 sentences. Address ${profile.accountability_partner_name ?? 'their partner'} directly. Make it clear this is an automated accountability message from Zoned.`,
        },
        {
          role: 'user',
          content: 'Generate the accountability message.',
        },
      ],
    });

    const message =
      completion.choices[0]?.message?.content?.trim() ??
      `${profile.name} got distracted during their focus session. Help hold them accountable!`;

    const twilioMessage = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM!,
      to: `whatsapp:${profile.accountability_partner_phone}`,
      body: message,
    });

    await supabase.from('accountability_triggers').insert({
      session_id,
      user_id,
      trigger_reason: trigger_reason ?? '5x_gaze_away',
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
    console.error('accountability error:', error);
    return NextResponse.json(
      { error: 'Failed to send accountability message' },
      { status: 500 }
    );
  }
}
